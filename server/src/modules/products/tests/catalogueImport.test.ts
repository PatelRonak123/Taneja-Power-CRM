import assert from 'node:assert/strict';
import { CatalogueImporter, type ImportCandidate } from '../scripts/importCatalogue.js';

async function runImporterTests() {
  console.log('--- Starting Catalogue Importer Unit & Validation Tests ---');

  const importer = new CatalogueImporter();

  // Test 1: Validation rejects empty dataset
  {
    assert.throws(
      () => importer.validateDataset([], []),
      /Import dataset is empty or invalid/
    );
    console.log('  ✓ Test 1: Rejects empty dataset');
  }

  // Test 2: Validation rejects dataset with wrong count (< 436)
  {
    assert.throws(
      () => importer.validateDataset([{ sku: 'SKU-1', name: 'Product 1', category: 'UPS', price: 100, sourceSheet: 'S1', sourceRowNumber: 1 }], []),
      /Expected exactly 436 import-ready candidates/
    );
    console.log('  ✓ Test 2: Rejects unexpected candidate count');
  }

  // Test 3: Validation detects inclusion of review-required item
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      category: 'UPS',
      price: 100,
      sourceSheet: 'S1',
      sourceRowNumber: i + 1,
      status: 'ACTIVE',
    })) as ImportCandidate[];

    const reviewItems = [{ sku: 'SKU-5', reason: 'MOQ_CONFLICT' }];
    assert.throws(
      () => importer.validateDataset(mockList, reviewItems),
      /Review-required product 'SKU-5' found in import candidate set/
    );
    console.log('  ✓ Test 3: Strictly rejects inclusion of review-required items');
  }

  // Test 4: Validation detects duplicate SKUs within input
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: i === 10 ? 'SKU-0' : `SKU-${i}`, // Duplicate SKU-0 at index 10
      name: `Product ${i}`,
      category: 'UPS',
      price: 100,
      sourceSheet: 'S1',
      sourceRowNumber: i + 1,
      status: 'ACTIVE',
    })) as ImportCandidate[];

    assert.throws(
      () => importer.validateDataset(mockList, []),
      /Duplicate SKU detected within input set: "SKU-0"/
    );
    console.log('  ✓ Test 4: Rejects internal SKU duplication');
  }

  // Test 5: Validation detects invalid priceOnRequest / price / status combinations
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      category: 'UPS',
      price: i === 3 ? 500 : 100, // Invalid: priceOnRequest=true but price=500
      priceOnRequest: i === 3 ? true : false,
      status: i === 3 ? 'INACTIVE' : 'ACTIVE',
      sourceSheet: 'S1',
      sourceRowNumber: i + 1,
    })) as ImportCandidate[];

    assert.throws(
      () => importer.validateDataset(mockList, []),
      /is priceOnRequest=true but has price=500/
    );
    console.log('  ✓ Test 5: Enforces priceOnRequest price=0 and status=INACTIVE');
  }

  // Test 6: Validation detects minPrice > maxPrice
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      category: 'STABILIZER',
      price: 100,
      minPrice: i === 7 ? 5000 : 100,
      maxPrice: i === 7 ? 3000 : 200, // minPrice 5000 > maxPrice 3000
      status: 'ACTIVE',
      sourceSheet: 'S1',
      sourceRowNumber: i + 1,
    })) as ImportCandidate[];

    assert.throws(
      () => importer.validateDataset(mockList, []),
      /has minPrice \(5000\) > maxPrice \(3000\)/
    );
    console.log('  ✓ Test 6: Enforces minPrice <= maxPrice');
  }

  // Test 7: Validation detects broken parentProductSkuCandidate reference
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      category: 'TRANSFORMER',
      price: 100,
      parentProductSkuCandidate: i === 12 ? 'NONEXISTENT-PARENT-SKU' : undefined,
      status: 'ACTIVE',
      sourceSheet: 'S1',
      sourceRowNumber: i + 1,
    })) as ImportCandidate[];

    assert.throws(
      () => importer.validateDataset(mockList, []),
      /references nonexistent parent SKU 'NONEXISTENT-PARENT-SKU'/
    );
    console.log('  ✓ Test 7: Validates parent-child reference integrity');
  }

  // Test 8: Validation ensures sourceSheet and sourceRowNumber are present on all records
  {
    const mockList = Array.from({ length: 436 }, (_, i) => ({
      sku: `SKU-${i}`,
      name: `Product ${i}`,
      category: 'UPS',
      price: 100,
      status: 'ACTIVE',
      sourceSheet: i === 20 ? '' : 'S1',
      sourceRowNumber: i === 20 ? undefined : i + 1,
    })) as ImportCandidate[];

    assert.throws(
      () => importer.validateDataset(mockList, []),
      /lacks sourceSheet or sourceRowNumber provenance/
    );
    console.log('  ✓ Test 8: Enforces source provenance on 100% of records');
  }

  console.log('\n--- ALL IMPORTER VALIDATION TESTS PASSED SUCCESSFULLY ---\n');
}

runImporterTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
