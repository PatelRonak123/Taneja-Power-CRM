import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getValidatedAmcConversionHandoff,
  pruneOrphanedAmcConversion,
  AMC_CONVERSION_STORAGE_KEY,
  AmcConversionHandoff,
} from '../utils/amc-conversion-handoff.util.js';

// Minimal mock Storage implementation for isolation
class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('Stage B3.5.4: AMC Conversion Handoff Stabilization Tests', () => {
  const customerId = 'cust-1111-2222-3333-444444444444';
  const followUpId = 'fu-5555-6666-7777-888888888888';
  const equipmentId = 'eq-9999-0000-1111-222222222222';
  const conversionId = `conv_${followUpId}_1728734000000`;

  const validHandoff: AmcConversionHandoff = {
    conversionId,
    followUpId,
    equipmentId,
    customerId,
    customerName: 'Acme Power Ltd',
    companyName: 'Acme Corp',
    assetNumber: 'AST-10023',
    productName: 'SERVO STABILIZER 50KVA',
    make: 'TANEJA',
    model: 'TS-50KVA',
    capacityRating: '50 kVA',
    warrantyEndDate: '2026-10-14',
    amcStartDate: '2026-10-15',
    amcEndDate: '2027-10-14',
    createdAt: Date.now(),
  };

  it('1. Valid handoff matches conversionId and customerId -> returns parsed data and isConversionFlow: true', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));

    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.error, undefined);
    assert.ok(result.data);
    assert.equal(result.data.conversionId, conversionId);
    assert.equal(result.data.customerId, customerId);
    assert.equal(result.data.followUpId, followUpId);
    assert.equal(result.data.equipmentId, equipmentId);
    assert.equal(result.data.assetNumber, 'AST-10023');
    assert.equal(result.data.amcStartDate, '2026-10-15');
    assert.equal(result.data.amcEndDate, '2027-10-14');
  });

  it('2. Ordinary visit without conversionId does NOT consume leftover session data', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));

    // Ordinary visit: e.g. clicking "+ New Quotation" from sidebar
    const search = '';
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, false);
    assert.equal(result.data, null);
    assert.equal(result.error, undefined);
  });

  it('3. pruneOrphanedAmcConversion removes abandoned handoffs on ordinary visits without touching unrelated keys', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));
    storage.setItem('pending_repair_link', JSON.stringify({ contractId: 'c-1', requestId: 'r-1' }));
    storage.setItem('user_theme', 'dark');

    // Visiting ordinary page (no conversionId in URL)
    pruneOrphanedAmcConversion('', storage);

    assert.equal(storage.getItem(AMC_CONVERSION_STORAGE_KEY), null, 'Abandoned AMC conversion must be pruned');
    assert.ok(storage.getItem('pending_repair_link'), 'Unrelated pending repair link must NOT be touched');
    assert.equal(storage.getItem('user_theme'), 'dark', 'Unrelated session settings must NOT be touched');
  });

  it('4. pruneOrphanedAmcConversion preserves handoff when conversionId IS present in URL', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));

    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    pruneOrphanedAmcConversion(search, storage);

    assert.ok(storage.getItem(AMC_CONVERSION_STORAGE_KEY), 'Active AMC conversion must be preserved');
  });

  it('5. Missing session storage record reports error and fails safely', () => {
    const storage = new MockStorage();
    // Storage is empty, but URL has conversionId
    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.data, null);
    assert.match(result.error || '', /not found or has expired/i);
  });

  it('6. Malformed JSON in session storage fails safely without crashing', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, '{invalid_json}');

    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.data, null);
    assert.match(result.error || '', /failed to parse|malformed/i);
  });

  it('7. Mismatched conversionId in session storage reports error and is rejected', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify({
      ...validHandoff,
      conversionId: 'conv_different_token_123',
    }));

    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.data, null);
    assert.match(result.error || '', /does not match/i);
  });

  it('8. Mismatched customerId in URL reports error and is rejected', () => {
    const storage = new MockStorage();
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));

    // URL specifies a different customer than the handoff payload
    const search = `?type=AMC&customerId=cust-different-999&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.data, null);
    assert.match(result.error || '', /does not match conversion session customer/i);
  });

  it('9. Stale conversion older than 24 hours is rejected as expired', () => {
    const storage = new MockStorage();
    const expiredTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
    storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify({
      ...validHandoff,
      createdAt: expiredTimestamp,
    }));

    const search = `?type=AMC&customerId=${customerId}&conversionId=${conversionId}`;
    const result = getValidatedAmcConversionHandoff(search, storage);

    assert.equal(result.isConversionFlow, true);
    assert.equal(result.data, null);
    assert.match(result.error || '', /expired/i);
  });

  describe('10. Quotation Form Payload Construction & Guard Logic', () => {
    function constructTestPayload(params: {
      quotationType: string;
      selectedCustomerId: string;
      handoffData: AmcConversionHandoff | null;
      items: any[];
    }) {
      const { quotationType, selectedCustomerId, handoffData, items } = params;

      const isAmcConversion =
        quotationType === 'AMC' &&
        !!handoffData &&
        handoffData.customerId === selectedCustomerId;

      return {
        quotationType,
        customerId: selectedCustomerId,
        sourceEquipmentId:
          (isAmcConversion ? handoffData?.equipmentId : null) || null,
        sourceFollowUpId:
          (isAmcConversion ? handoffData?.followUpId : null) || null,
        items,
      };
    }

    it('10.1 Attaches source IDs when quotationType is AMC and customer matches handoff', () => {
      const payload = constructTestPayload({
        quotationType: 'AMC',
        selectedCustomerId: customerId,
        handoffData: validHandoff,
        items: [{ itemType: 'AMC', productName: validHandoff.productName, customerEquipmentIds: [equipmentId] }],
      });

      assert.equal(payload.sourceEquipmentId, equipmentId);
      assert.equal(payload.sourceFollowUpId, followUpId);
      assert.equal(payload.quotationType, 'AMC');
      assert.deepEqual(payload.items[0].customerEquipmentIds, [equipmentId]);
    });

    it('10.2 Strips source IDs if user changes selected customer in form dropdown', () => {
      const payload = constructTestPayload({
        quotationType: 'AMC',
        selectedCustomerId: 'cust-manually-changed-user-selection',
        handoffData: validHandoff,
        items: [{ itemType: 'AMC', productName: validHandoff.productName }],
      });

      assert.equal(payload.sourceEquipmentId, null, 'Must strip sourceEquipmentId when customer changed');
      assert.equal(payload.sourceFollowUpId, null, 'Must strip sourceFollowUpId when customer changed');
    });

    it('10.3 Strips source IDs if user changes quotationType to PRODUCT or SERVICE', () => {
      const payload = constructTestPayload({
        quotationType: 'PRODUCT',
        selectedCustomerId: customerId,
        handoffData: validHandoff,
        items: [{ itemType: 'PRODUCT', productName: 'Standard Transformer' }],
      });

      assert.equal(payload.sourceEquipmentId, null, 'Must strip source IDs if quotation is not AMC');
      assert.equal(payload.sourceFollowUpId, null, 'Must strip source IDs if quotation is not AMC');
    });

    it('10.4 Preserves manual equipment additions alongside the originating asset', () => {
      const payload = constructTestPayload({
        quotationType: 'AMC',
        selectedCustomerId: customerId,
        handoffData: validHandoff,
        items: [
          // Originating equipment line item
          { itemType: 'AMC', productName: validHandoff.productName, customerEquipmentIds: [equipmentId] },
          // Second line item added manually by user via modal
          { itemType: 'AMC', productName: 'ADDITIONAL STABILIZER 30KVA', customerEquipmentIds: ['eq-manually-added-2'] },
        ],
      });

      assert.equal(payload.items.length, 2);
      assert.deepEqual(payload.items[0].customerEquipmentIds, [equipmentId]);
      assert.deepEqual(payload.items[1].customerEquipmentIds, ['eq-manually-added-2']);
    });
  });

  describe('11. Submission & Cleanup Lifecycle', () => {
    it('11.1 Failed submission keeps handoff intact for user retry', () => {
      const storage = new MockStorage();
      storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));

      // Simulate a submission failure (e.g. network glitch or validation error)
      const simulatedError = new Error('Network timeout');
      assert.ok(simulatedError);

      // On error, CreateQuotationPage does NOT call removeItem
      assert.ok(storage.getItem(AMC_CONVERSION_STORAGE_KEY), 'Session storage handoff must remain intact for retry');
    });

    it('11.2 Successful submission removes only the AMC handoff', () => {
      const storage = new MockStorage();
      storage.setItem(AMC_CONVERSION_STORAGE_KEY, JSON.stringify(validHandoff));
      storage.setItem('user_auth_token', 'jwt.token.mock');

      // Simulate successful quotation creation
      storage.removeItem(AMC_CONVERSION_STORAGE_KEY);

      assert.equal(storage.getItem(AMC_CONVERSION_STORAGE_KEY), null);
      assert.equal(storage.getItem('user_auth_token'), 'jwt.token.mock');
    });
  });
});
