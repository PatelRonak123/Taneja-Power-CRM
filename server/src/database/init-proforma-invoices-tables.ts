import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initProformaInvoiceTables() {
  console.log('🔄 Initializing proforma_invoices tables and relations...');

  // 1. Create proforma_invoices table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS proforma_invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proforma_invoice_number VARCHAR(100) NOT NULL UNIQUE,
      sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      proforma_invoice_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      validity_date TIMESTAMPTZ,
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      currency VARCHAR(10) NOT NULL DEFAULT 'INR',
      customer_name VARCHAR(255) NOT NULL,
      legal_name VARCHAR(255),
      gstin VARCHAR(50),
      pan VARCHAR(50),
      customer_email VARCHAR(255),
      customer_phone VARCHAR(50),
      billing_address TEXT,
      billing_city VARCHAR(100),
      billing_state VARCHAR(100),
      billing_pincode VARCHAR(20),
      billing_state_code VARCHAR(10),
      shipping_name VARCHAR(255),
      shipping_address TEXT,
      shipping_city VARCHAR(100),
      shipping_state VARCHAR(100),
      shipping_pincode VARCHAR(20),
      shipping_state_code VARCHAR(10),
      payment_terms TEXT,
      delivery_terms TEXT,
      expected_delivery_timeline VARCHAR(100),
      bank_details TEXT,
      notes TEXT,
      subtotal NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      discount_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      igst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      total_tax NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      round_off NUMERIC(10, 2) NOT NULL DEFAULT '0.00',
      total_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      advance_amount_requested NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      paid_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      issued_by UUID REFERENCES users(id) ON DELETE SET NULL,
      issued_at TIMESTAMPTZ,
      cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
      cancelled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      revision_number INTEGER NOT NULL DEFAULT 1,
      related_tax_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS proforma_invoices_sales_order_id_idx ON proforma_invoices(sales_order_id);
    CREATE INDEX IF NOT EXISTS proforma_invoices_customer_id_idx ON proforma_invoices(customer_id);
    CREATE INDEX IF NOT EXISTS proforma_invoices_status_idx ON proforma_invoices(status);
    CREATE INDEX IF NOT EXISTS proforma_invoices_pi_date_idx ON proforma_invoices(proforma_invoice_date);
    CREATE INDEX IF NOT EXISTS proforma_invoices_created_by_idx ON proforma_invoices(created_by);
  `);

  // 2. Create proforma_invoice_items table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS proforma_invoice_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proforma_invoice_id UUID NOT NULL REFERENCES proforma_invoices(id) ON DELETE CASCADE,
      sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE RESTRICT,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      product_name_snapshot VARCHAR(255) NOT NULL,
      sku_snapshot VARCHAR(100),
      description_snapshot TEXT,
      hsn_sac_snapshot VARCHAR(50),
      unit_snapshot VARCHAR(50) NOT NULL DEFAULT 'NOS',
      quantity NUMERIC(12, 3) NOT NULL,
      unit_price NUMERIC(14, 2) NOT NULL,
      discount_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      taxable_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      tax_rate NUMERIC(5, 2) NOT NULL DEFAULT '18.00',
      cgst_rate NUMERIC(5, 2) NOT NULL DEFAULT '0.00',
      sgst_rate NUMERIC(5, 2) NOT NULL DEFAULT '0.00',
      igst_rate NUMERIC(5, 2) NOT NULL DEFAULT '0.00',
      cgst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      sgst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      igst_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      tax_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      line_total NUMERIC(14, 2) NOT NULL DEFAULT '0.00',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS proforma_invoice_items_pi_id_idx ON proforma_invoice_items(proforma_invoice_id);
    CREATE INDEX IF NOT EXISTS proforma_invoice_items_so_item_id_idx ON proforma_invoice_items(sales_order_item_id);
    CREATE INDEX IF NOT EXISTS proforma_invoice_items_product_id_idx ON proforma_invoice_items(product_id);
  `);

  // 3. Add proforma_invoice_id and sales_order_id columns to payments table
  await db.execute(sql`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS proforma_invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE SET NULL;

    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS payments_proforma_invoice_id_idx ON payments(proforma_invoice_id);
    CREATE INDEX IF NOT EXISTS payments_sales_order_id_idx ON payments(sales_order_id);
  `);

  // 4. Add proforma_invoice_id column to sales_invoices table
  await db.execute(sql`
    ALTER TABLE sales_invoices
    ADD COLUMN IF NOT EXISTS proforma_invoice_id UUID REFERENCES proforma_invoices(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS sales_invoices_proforma_invoice_id_idx ON sales_invoices(proforma_invoice_id);
  `);

  console.log('✅ Proforma Invoice tables and foreign key columns initialized successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initProformaInvoiceTables()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to initialize proforma invoice tables:', err);
      await pool.end();
      process.exit(1);
    });
}
