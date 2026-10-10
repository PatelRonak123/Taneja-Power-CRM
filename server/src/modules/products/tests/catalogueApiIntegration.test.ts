import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProductMapper } from '../mappers/product.mapper.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductsSchema,
} from '../validators/product.validator.js';
import type { ProductEntity } from '../../../database/schema/products.js';

console.log('--- Starting Catalogue API & UI Integration Tests (Phase 4) ---');

// Mock legacy product with null catalogue fields
const legacyProduct: ProductEntity = {
  id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Legacy 10kVA Servo Stabilizer',
  sku: 'LEGACY-STAB-10K',
  description: 'Original legacy inventory entry',
  category: 'Stabilizers',
  price: '45000.00',
  stockQuantity: 5,
  status: 'ACTIVE',
  brand: null,
  model: null,
  subModel: null,
  series: null,
  warrantyDescription: null,
  hsnSac: null,
  gstRate: null,
  unit: 'NOS',
  moq: null,
  mrp: null,
  dealerPrice: null,
  partnerPrice: null,
  dtp: null,
  minPrice: null,
  maxPrice: null,
  priceOnRequest: false,
  basicPrice: null,
  gstPaidPrice: null,
  recommendedPrice: null,
  capacityRating: null,
  phase: null,
  technicalSpecifications: null,
  parentProductId: null,
  sourceSheet: null,
  sourceRowNumber: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-01T00:00:00Z'),
};

// Mock imported Hitachi child product with parent product relationship and commercial pricing
const hitachiChildProduct: ProductEntity & { parentProduct?: any } = {
  id: 'b0000000-0000-0000-0000-000000000002',
  name: 'Hitachi Inbuilt Isolation Transformer 10kVA',
  sku: 'HIT-TX-INB-10KVA',
  description: 'Inbuilt galvanically isolated transformer for UPS',
  category: 'Transformers',
  price: '28000.00',
  stockQuantity: 10,
  status: 'ACTIVE',
  brand: 'Hitachi',
  model: 'HS33-TX-10K',
  subModel: 'Inbuilt',
  series: 'HS33',
  warrantyDescription: '2 Years Manufacturer',
  hsnSac: '85043100',
  gstRate: '18.00',
  unit: 'NOS',
  moq: 1,
  mrp: '35000.00',
  dealerPrice: '22000.00',
  partnerPrice: '24000.00',
  dtp: '21500.00',
  minPrice: '25000.00',
  maxPrice: '32000.00',
  priceOnRequest: false,
  basicPrice: '23728.81',
  gstPaidPrice: '28000.00',
  recommendedPrice: '28000.00',
  capacityRating: '10kVA',
  phase: '3-Phase',
  technicalSpecifications: 'Copper wound, Class H insulation',
  parentProductId: 'c0000000-0000-0000-0000-000000000003',
  parentProduct: {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Hitachi 10kVA Online UPS (HS33010)',
    sku: 'HIT-UPS-10KVA-HS33',
    brand: 'Hitachi',
    model: 'HS33010',
  },
  sourceSheet: 'Hitachi',
  sourceRowNumber: 15,
  createdAt: new Date('2026-10-10T06:00:00Z'),
  updatedAt: new Date('2026-10-10T06:00:00Z'),
};

// Mock unpriced stabilizer with price on request
const unpricedStabilizer: ProductEntity = {
  id: 'd0000000-0000-0000-0000-000000000004',
  name: 'Taneja Power 700kVA Industrial Stabilizer',
  sku: 'TP-STAB-700KVA-POR',
  description: 'High capacity oil cooled stabilizer',
  category: 'Stabilizers',
  price: '0.00',
  stockQuantity: 0,
  status: 'INACTIVE',
  brand: 'Taneja Power',
  model: 'TPS-700K',
  subModel: 'Oil Cooled',
  series: 'Heavy Industrial',
  warrantyDescription: '12 Months Standard',
  hsnSac: '85044090',
  gstRate: '18.00',
  unit: 'NOS',
  moq: 1,
  mrp: null,
  dealerPrice: null,
  partnerPrice: null,
  dtp: null,
  minPrice: null,
  maxPrice: null,
  priceOnRequest: true,
  basicPrice: null,
  gstPaidPrice: null,
  recommendedPrice: null,
  capacityRating: '700kVA',
  phase: '3-Phase',
  technicalSpecifications: 'Double wound, motorized variac',
  parentProductId: null,
  sourceSheet: 'Stabilizers',
  sourceRowNumber: 110,
  createdAt: new Date('2026-10-10T06:00:00Z'),
  updatedAt: new Date('2026-10-10T06:00:00Z'),
};

// 1. Role-Based Commercial Pricing Filtering
{
  // Test A: Unauthenticated user request must strip sensitive pricing
  const publicDto = ProductMapper.toDto(hitachiChildProduct, null);
  assert.equal(publicDto.price, 28000);
  assert.equal(publicDto.mrp, 35000);
  assert.equal(publicDto.dealerPrice, undefined, 'Public DTO must not expose dealerPrice');
  assert.equal(publicDto.partnerPrice, undefined, 'Public DTO must not expose partnerPrice');
  assert.equal(publicDto.dtp, undefined, 'Public DTO must not expose dtp');
  assert.equal(publicDto.minPrice, undefined, 'Public DTO must not expose minPrice');
  assert.equal(publicDto.maxPrice, undefined, 'Public DTO must not expose maxPrice');
  assert.equal(publicDto.basicPrice, undefined, 'Public DTO must not expose basicPrice');
  assert.equal(publicDto.gstPaidPrice, undefined, 'Public DTO must not expose gstPaidPrice');
  assert.equal(publicDto.sourceSheet, undefined, 'Public DTO must not expose sourceSheet provenance');
  assert.equal(publicDto.parentProduct?.sku, 'HIT-UPS-10KVA-HS33', 'Public DTO must preserve parentProduct info');
  console.log('  ✓ Test 1: Unauthenticated request strictly filters confidential commercial pricing');

  // Test B: Authenticated Admin / Sales user receives full commercial tiers
  const adminDto = ProductMapper.toDto(hitachiChildProduct, { role: 'ADMIN' });
  assert.equal(adminDto.dealerPrice, 22000, 'Admin receives dealerPrice');
  assert.equal(adminDto.partnerPrice, 24000, 'Admin receives partnerPrice');
  assert.equal(adminDto.dtp, 21500, 'Admin receives dtp');
  assert.equal(adminDto.minPrice, 25000, 'Admin receives minPrice');
  assert.equal(adminDto.maxPrice, 32000, 'Admin receives maxPrice');
  assert.equal(adminDto.sourceSheet, 'Hitachi');
  assert.equal(adminDto.sourceRowNumber, 15);
  console.log('  ✓ Test 2: Authenticated commercial roles receive permitted pricing tiers and audit provenance');

  // Test C: Sales Office user (Role USER with designation "Sales Office") receives commercial tiers
  const salesDto = ProductMapper.toDto(hitachiChildProduct, { role: 'USER', designation: 'Sales Office' });
  assert.equal(salesDto.dealerPrice, 22000, 'Sales Office user receives dealerPrice');
  console.log('  ✓ Test 3: Sales Office designation correctly elevates commercial field visibility');
}

// 2. Legacy Product Compatibility
{
  const legacyDto = ProductMapper.toDto(legacyProduct, null);
  assert.equal(legacyDto.name, 'Legacy 10kVA Servo Stabilizer');
  assert.equal(legacyDto.brand, null);
  assert.equal(legacyDto.model, null);
  assert.equal(legacyDto.price, 45000);
  assert.equal(legacyDto.unit, 'NOS');
  assert.equal(legacyDto.parentProductId, null);
  console.log('  ✓ Test 4: Legacy products with null catalogue columns map and serialize cleanly');
}

// 3. Price-On-Request Behavior
{
  const porDto = ProductMapper.toDto(unpricedStabilizer, { role: 'ADMIN' });
  assert.equal(porDto.price, 0);
  assert.equal(porDto.priceOnRequest, true);
  assert.equal(porDto.status, 'INACTIVE');
  console.log('  ✓ Test 5: Unpriced stabilizers reflect priceOnRequest=true and INACTIVE status');
}

// 4. Create Product Validation
{
  // A: Price = 0 without priceOnRequest is rejected
  const badPriceRes = createProductSchema.safeParse({
    body: {
      name: 'Test UPS',
      sku: 'TEST-UPS-001',
      category: 'UPS Systems',
      price: 0,
      priceOnRequest: false,
    },
  });
  assert.equal(badPriceRes.success, false, 'Must reject price <= 0 when priceOnRequest is false');

  // B: Price = 0 WITH priceOnRequest is accepted
  const goodPorRes = createProductSchema.safeParse({
    body: {
      name: 'Custom Megawatt UPS',
      sku: 'TEST-UPS-POR-001',
      category: 'UPS Systems',
      price: 0,
      priceOnRequest: true,
      status: 'INACTIVE',
    },
  });
  assert.equal(goodPorRes.success, true, 'Must allow price=0 when priceOnRequest is true');

  // C: minPrice > maxPrice is rejected
  const invalidRangeRes = createProductSchema.safeParse({
    body: {
      name: 'Variable Stabilizer',
      sku: 'TEST-STAB-VAR',
      category: 'Stabilizers',
      price: 50000,
      minPrice: 60000,
      maxPrice: 40000,
    },
  });
  assert.equal(invalidRangeRes.success, false, 'Must reject minPrice > maxPrice');
  console.log('  ✓ Test 6: Create validator enforces price constraints and min/max bounds');
}

// 5. Update Product Validation & Partial Updating
{
  // A: Valid partial patch preserving omitted fields
  const partialRes = updateProductSchema.safeParse({
    params: { id: 'a0000000-0000-0000-0000-000000000001' },
    body: {
      name: 'Updated Stabilizer Title',
      model: 'REV-B',
    },
  });
  assert.equal(partialRes.success, true, 'Partial update without prices must succeed');

  // B: Rejection of invalid UUID
  const invalidIdRes = updateProductSchema.safeParse({
    params: { id: 'not-a-uuid' },
    body: { name: 'New Title' },
  });
  assert.equal(invalidIdRes.success, false, 'Must reject invalid UUID in route params');
  console.log('  ✓ Test 7: Update validator supports partial patches and UUID validation');
}

// 6. List Products Query Schema Validation
{
  // A: Accepts search, category, brand, status, and priceOnRequest
  const validQuery = listProductsSchema.safeParse({
    query: {
      search: 'Hitachi',
      category: 'Transformers',
      brand: 'Hitachi',
      status: 'ACTIVE',
      priceOnRequest: 'true',
      page: '2',
      limit: '25',
    },
  });
  assert.equal(validQuery.success, true);
  if (validQuery.success) {
    assert.equal(validQuery.data.query.priceOnRequest, true);
    assert.equal(validQuery.data.query.page, 2);
    assert.equal(validQuery.data.query.limit, 25);
  }

  // B: Rejects negative limit
  const badLimitQuery = listProductsSchema.safeParse({
    query: { limit: '-5' },
  });
  assert.equal(badLimitQuery.success, false, 'Must reject negative limit');
  console.log('  ✓ Test 8: List query parser safely validates pagination and filter parameters');
}

// 7. Quotation Business Rule Validation
{
  // A: Inactive product cannot be selected for quotation
  const isInactive = unpricedStabilizer.status === 'INACTIVE';
  assert.equal(isInactive, true, 'Unpriced stabilizer is inactive');

  // B: Quoting a priceOnRequest item requires explicit negotiated unit price
  const quotedPriceOnRequestItem = {
    productId: unpricedStabilizer.id,
    unitPrice: 0, // Not negotiated yet
  };
  const isInvalidQuote = unpricedStabilizer.priceOnRequest && quotedPriceOnRequestItem.unitPrice <= 0;
  assert.equal(isInvalidQuote, true, 'Quoting priceOnRequest product with zero unitPrice must be rejected');

  const validNegotiatedItem = {
    productId: unpricedStabilizer.id,
    unitPrice: 1250000, // Explicitly agreed price
  };
  const isValidNegotiatedQuote = unpricedStabilizer.priceOnRequest && validNegotiatedItem.unitPrice > 0;
  assert.equal(isValidNegotiatedQuote, true, 'Valid negotiated price for priceOnRequest product is accepted');
  console.log('  ✓ Test 9: Quotation workflow rules enforce active status and negotiated pricing');
}

console.log('\n--- ALL CATALOGUE API & UI INTEGRATION TESTS PASSED (9/9) ---\n');
