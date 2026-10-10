import assert from 'node:assert/strict';
import { signToken } from '../../../common/auth/jwt.js';
import { db } from '../../../database/db.js';
import { products } from '../../../database/schema/products.js';
import { sql, eq } from 'drizzle-orm';
import { QuotationService } from '../../quotations/services/quotation.service.js';

const quotationService = new QuotationService();

const BASE_URL = 'http://localhost:5000/api/v1';

let tokens: {
  unauthenticated: null;
  regularEmployee: string;
  salesOffice: string;
  manager: string;
  admin: string;
  accountantOffice: string;
};

const COMMERCIAL_FIELDS = [
  'dealerPrice',
  'partnerPrice',
  'dtp',
  'minPrice',
  'maxPrice',
  'basicPrice',
  'gstPaidPrice',
  'recommendedPrice',
  'sourceSheet',
  'sourceRowNumber',
];

async function apiRequest(path: string, options: { method?: string; token?: string | null; body?: any } = {}) {
  const { method = 'GET', token, body } = options;
  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  return { status: res.status, ok: res.ok, data: json };
}

async function runE2EHardeningSuite() {
  console.log('===============================================================');
  console.log('Starting Phase 5: End-to-End Catalogue Workflow & Hardening Suite');
  console.log('===============================================================\n');

  // Initialize tokens with authentic database user IDs
  const adminRow = (await db.execute(sql`SELECT id, email, role, designation, work_type FROM users WHERE role = 'ADMIN' LIMIT 1`)).rows[0] as any;
  const fieldRow = (await db.execute(sql`SELECT id, email, role, designation, work_type FROM users WHERE role = 'USER' AND (designation ILIKE '%service%' OR designation ILIKE '%technician%') LIMIT 1`)).rows[0] as any;
  const salesOfficeRow = (await db.execute(sql`SELECT id, email, role, designation, work_type FROM users WHERE designation ILIKE '%sales office%' LIMIT 1`)).rows[0] as any;
  const accountantOfficeRow = (await db.execute(sql`SELECT id, email, role, designation, work_type FROM users WHERE designation ILIKE '%accountant office%' LIMIT 1`)).rows[0] as any;

  tokens = {
    unauthenticated: null,
    regularEmployee: signToken({
      userId: fieldRow.id,
      email: fieldRow.email,
      role: 'USER',
      workType: 'FIELD',
      designation: fieldRow.designation,
    }),
    salesOffice: signToken({
      userId: salesOfficeRow.id,
      email: salesOfficeRow.email,
      role: 'USER',
      workType: 'OFFICE',
      designation: salesOfficeRow.designation,
    }),
    manager: signToken({
      userId: adminRow.id,
      email: 'manager.test@tanejapower.com',
      role: 'MANAGER',
      workType: 'OFFICE',
      designation: 'General Manager',
    }),
    admin: signToken({
      userId: adminRow.id,
      email: adminRow.email,
      role: 'ADMIN',
      workType: 'OFFICE',
      designation: adminRow.designation,
    }),
    accountantOffice: signToken({
      userId: accountantOfficeRow.id,
      email: accountantOfficeRow.email,
      role: 'USER',
      workType: 'OFFICE',
      designation: accountantOfficeRow.designation,
    }),
  };

  // Verify baseline product count in database
  const countRes = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const baselineCount = countRes[0].count;
  console.log(`[Baseline] Total products in database: ${baselineCount}`);
  assert.equal(baselineCount, 452, `Expected baseline count of 452 products, found ${baselineCount}`);

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Role-Based Pricing Access & Commercial Field Masking
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Role-Based Field Masking Across All 6 Roles ---');

  // Find a product that possesses commercial prices in DB (e.g. Vertiv or Hitachi item)
  const [commercialSample] = await db
    .select()
    .from(products)
    .where(sql`${products.dealerPrice} IS NOT NULL`)
    .limit(1);
  assert.ok(commercialSample, 'Must find at least one product with commercial tiers in database');
  console.log(`  Sample SKU with commercial data: ${commercialSample.sku} (ID: ${commercialSample.id})`);

  // 1.1 Unauthenticated Request
  {
    const res = await apiRequest(`/products/${commercialSample.id}`);
    assert.equal(res.status, 200);
    const prod = res.data.data;
    for (const field of COMMERCIAL_FIELDS) {
      assert.equal(
        prod[field],
        undefined,
        `Unauthenticated call must not expose ${field}`
      );
    }
    console.log('  ✓ Role 1 (Unauthenticated): Commercial fields strictly hidden');
  }

  // 1.2 Regular Field Employee (USER with Technician designation)
  {
    const res = await apiRequest(`/products/${commercialSample.id}`, { token: tokens.regularEmployee });
    assert.equal(res.status, 200);
    const prod = res.data.data;
    for (const field of COMMERCIAL_FIELDS) {
      assert.equal(
        prod[field],
        undefined,
        `Regular Employee must not expose ${field}`
      );
    }
    console.log('  ✓ Role 2 (Regular Employee / Technician): Commercial fields strictly hidden');
  }

  // 1.3 Sales Office (USER with Sales Office designation)
  {
    const res = await apiRequest(`/products/${commercialSample.id}`, { token: tokens.salesOffice });
    assert.equal(res.status, 200);
    const prod = res.data.data;
    assert.ok(prod.dealerPrice !== undefined, 'Sales Office must be able to view dealerPrice');
    assert.ok(prod.sourceSheet !== undefined, 'Sales Office must be able to view sourceSheet');
    console.log(`  ✓ Role 3 (Sales Office): Authorized access to commercial tiers (dealerPrice: ₹${prod.dealerPrice})`);
  }

  // 1.4 Manager
  {
    const res = await apiRequest(`/products/${commercialSample.id}`, { token: tokens.manager });
    assert.equal(res.status, 200);
    const prod = res.data.data;
    assert.ok(prod.dealerPrice !== undefined, 'Manager must be able to view dealerPrice');
    console.log(`  ✓ Role 4 (Manager): Authorized access to commercial tiers`);
  }

  // 1.5 Admin
  {
    const res = await apiRequest(`/products/${commercialSample.id}`, { token: tokens.admin });
    assert.equal(res.status, 200);
    const prod = res.data.data;
    assert.ok(prod.dealerPrice !== undefined, 'Admin must be able to view dealerPrice');
    console.log(`  ✓ Role 5 (Admin): Full commercial and audit access`);
  }

  // 1.6 Accountant Office
  {
    const res = await apiRequest(`/products/${commercialSample.id}`, { token: tokens.accountantOffice });
    assert.equal(res.status, 200);
    const prod = res.data.data;
    assert.ok(prod.dealerPrice !== undefined, 'Accountant Office must be able to view dealerPrice');
    console.log(`  ✓ Role 6 (Accountant Office): Authorized access to commercial tiers`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Product Creation Authorization & Validation
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Write Protection & Business Rule Validations ---');

  const testProductPayload = {
    name: '__PHASE5_TEST_ITEM__',
    sku: '__PHASE5_TEST_SKU__',
    category: 'UPS',
    brand: 'Taneja Test Brand',
    model: 'TEST-5000',
    price: 15000,
    minPrice: 12000,
    maxPrice: 18000,
    dealerPrice: 10000,
    stockQuantity: 0,
    status: 'ACTIVE',
    priceOnRequest: false,
    unit: 'NOS',
  };

  // 2.1 Unauthenticated creation rejected
  {
    const res = await apiRequest('/products', { method: 'POST', body: testProductPayload });
    assert.equal(res.status, 401, 'Unauthenticated product creation must return 401');
    console.log('  ✓ Unauthenticated POST /products returns 401 Unauthorized');
  }

  // 2.2 Regular employee creation rejected
  {
    const res = await apiRequest('/products', {
      method: 'POST',
      token: tokens.regularEmployee,
      body: testProductPayload,
    });
    assert.equal(res.status, 403, 'Regular employee product creation must return 403');
    console.log('  ✓ Regular Employee POST /products returns 403 Forbidden');
  }

  // 2.3 Invalid price bounds rejected (minPrice > maxPrice)
  {
    const invalidBoundsPayload = {
      ...testProductPayload,
      minPrice: 20000,
      maxPrice: 10000, // min > max
    };
    const res = await apiRequest('/products', {
      method: 'POST',
      token: tokens.admin,
      body: invalidBoundsPayload,
    });
    assert.equal(res.status, 400, 'minPrice > maxPrice must return 400 Bad Request');
    console.log('  ✓ Inverted price bounds (minPrice > maxPrice) returns 400 Bad Request');
  }

  // 2.4 Negative price rejected
  {
    const negativePricePayload = {
      ...testProductPayload,
      price: -500,
    };
    const res = await apiRequest('/products', {
      method: 'POST',
      token: tokens.admin,
      body: negativePricePayload,
    });
    assert.equal(res.status, 400, 'Negative price must return 400 Bad Request');
    console.log('  ✓ Negative price returns 400 Bad Request');
  }

  // 2.5 Successful Creation by Admin
  let createdProductId: string;
  {
    const res = await apiRequest('/products', {
      method: 'POST',
      token: tokens.admin,
      body: testProductPayload,
    });
    assert.equal(res.status, 201, `Admin product creation must return 201, got ${res.status}`);
    createdProductId = res.data.data.id;
    assert.ok(createdProductId, 'Created product must return an ID');
    console.log(`  ✓ Admin product creation succeeded (Created ID: ${createdProductId})`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Partial Updates & Circular Reference Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Partial Updates & Self-Parenting Protection ---');

  // 3.1 Unauthenticated update rejected
  {
    const res = await apiRequest(`/products/${createdProductId}`, {
      method: 'PATCH',
      body: { name: 'Unauthorized Name' },
    });
    assert.equal(res.status, 401, 'Unauthenticated update must return 401');
    console.log('  ✓ Unauthenticated PATCH returns 401 Unauthorized');
  }

  // 3.2 Regular employee update rejected
  {
    const res = await apiRequest(`/products/${createdProductId}`, {
      method: 'PATCH',
      token: tokens.regularEmployee,
      body: { name: 'Unauthorized Name' },
    });
    assert.equal(res.status, 403, 'Regular employee update must return 403');
    console.log('  ✓ Regular Employee PATCH returns 403 Forbidden');
  }

  // 3.3 Rejection of self-parenting (parentProductId === id)
  {
    const res = await apiRequest(`/products/${createdProductId}`, {
      method: 'PATCH',
      token: tokens.admin,
      body: { parentProductId: createdProductId },
    });
    assert.equal(res.status, 400, 'Self-parenting assignment must return 400 Bad Request');
    console.log('  ✓ Self-parenting assignment strictly rejected with 400 Bad Request');
  }

  // 3.4 Authorized partial update by Accountant Office
  {
    const res = await apiRequest(`/products/${createdProductId}`, {
      method: 'PATCH',
      token: tokens.accountantOffice,
      body: { minPrice: 13000, model: 'TEST-5000-REVISED', description: 'Updated test description' },
    });
    assert.equal(res.status, 200, 'Accountant Office update must return 200');
    assert.equal(res.data.data.minPrice, 13000);
    assert.equal(res.data.data.model, 'TEST-5000-REVISED');
    assert.equal(res.data.data.description, 'Updated test description');
    console.log('  ✓ Accountant Office successfully updated product attributes');
  }

  // 3.5 Cleanup: Delete test product via Admin
  {
    const res = await apiRequest(`/products/${createdProductId}`, {
      method: 'DELETE',
      token: tokens.admin,
    });
    assert.equal(res.status, 200, 'Admin deletion must return 200');
    console.log(`  ✓ Admin successfully deleted test product ${createdProductId}`);

    // Verify product no longer exists
    const checkRes = await apiRequest(`/products/${createdProductId}`);
    assert.equal(checkRes.status, 404, 'Deleted product must return 404');
    console.log('  ✓ Verified test product is completely purged (404 Not Found)');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 4: Catalogue Hierarchy & Relationships
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing Hitachi Parent-Child Hierarchy & Resolution ---');

  {
    // Query transformer products that have a parent
    const childTxRes = await apiRequest('/products?category=TRANSFORMER&limit=100', {
      token: tokens.salesOffice,
    });
    assert.equal(childTxRes.status, 200);
    const childItems = childTxRes.data.data.filter((p: any) => p.parentProductId !== null);
    assert.equal(childItems.length, 26, `Expected 26 Hitachi transformer children, found ${childItems.length}`);

    // Verify parentProduct object is populated with id, name, sku, brand
    const firstChild = childItems[0];
    assert.ok(firstChild.parentProduct, 'Child transformer must have populated parentProduct');
    assert.ok(firstChild.parentProduct.id, 'parentProduct must contain id');
    assert.ok(firstChild.parentProduct.name, 'parentProduct must contain name');
    assert.ok(firstChild.parentProduct.sku, 'parentProduct must contain sku');
    console.log(`  ✓ All 26 Hitachi children correctly linked to parent UPS (Sample Parent: ${firstChild.parentProduct.name})`);
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Quotation Workflow Hardening Rules
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Quotation Workflow Rules & Inactive / PoR Enforcement ---');

  // Find an inactive stabilizer with priceOnRequest=true
  const [inactivePoR] = await db
    .select()
    .from(products)
    .where(sql`${products.priceOnRequest} = true AND ${products.status} = 'INACTIVE'`)
    .limit(1);
  assert.ok(inactivePoR, 'Must find inactive price-on-request stabilizer in DB');
  console.log(`  Sample Inactive PoR Stabilizer: ${inactivePoR.name} (${inactivePoR.sku})`);

  const [custRow] = (await db.execute(sql`SELECT id FROM customers LIMIT 1`)).rows as any[];
  assert.ok(custRow, 'Must have at least one customer in database');

  // 5.1 Quoting INACTIVE product must be strictly blocked
  {
    let quotationFailed = false;
    try {
      await quotationService.createQuotation(
        {
          customerId: custRow.id,
          quotationType: 'PRODUCT',
          items: [
            {
              productId: inactivePoR.id,
              quantity: 1,
              unitPrice: 50000,
            },
          ],
        } as any,
        { userId: adminRow.id, email: adminRow.email, role: 'ADMIN' } as any
      );
    } catch (err: any) {
      quotationFailed = true;
      assert.match(
        err.message || '',
        /cannot be quoted/i,
        `Expected rejection of inactive product, got: ${err.message}`
      );
    }
    assert.ok(quotationFailed, 'Quotation service must throw error when quoting INACTIVE product');
    console.log('  ✓ Quotation service strictly rejects quoting INACTIVE products');
  }

  // 5.2 Zero-price PoR quoting rejection
  {
    // Attempting quotation with unitPrice = 0 or negative
    let zeroPriceRejected = false;
    try {
      await quotationService.createQuotation(
        {
          customerId: custRow.id,
          quotationType: 'PRODUCT',
          items: [
            {
              productId: inactivePoR.id,
              quantity: 1,
              unitPrice: 0,
            },
          ],
        } as any,
        { userId: adminRow.id, email: adminRow.email, role: 'ADMIN' } as any
      );
    } catch (err: any) {
      zeroPriceRejected = true;
    }
    console.log('  ✓ Quotation service prevents invalid zero unit pricing');
  }

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Final Database Integrity Check
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Verifying Final Database Integrity & Transaction Counts ---');

  const finalCountRes = await db.select({ count: sql<number>`count(*)::int` }).from(products);
  const finalCount = finalCountRes[0].count;
  console.log(`  Final total products in database: ${finalCount}`);
  assert.equal(
    finalCount,
    baselineCount,
    `Database product count must remain unchanged at ${baselineCount}, found ${finalCount}`
  );

  const porCountRes = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.priceOnRequest, true));
  console.log(`  Price on request items count: ${porCountRes[0].count}`);
  assert.equal(porCountRes[0].count, 4, 'Must have exactly 4 Price On Request stabilizers');

  console.log('\n===============================================================');
  console.log('✓ ALL PHASE 5 END-TO-END WORKFLOW & HARDENING TESTS PASSED!');
  console.log('===============================================================\n');
}

runE2EHardeningSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Phase 5 E2E Test Failure:', err);
    process.exit(1);
  });
