import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initPaymentsTables() {
  console.log('🔄 Initializing payments tables and columns...');

  // 1. Add paid_amount column to sales_invoices if not exists
  await db.execute(sql`
    ALTER TABLE sales_invoices 
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(14, 2) NOT NULL DEFAULT '0.00';
  `);

  // 2. Create payments table if not exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      payment_number VARCHAR(100) NOT NULL UNIQUE,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
      amc_contract_id UUID REFERENCES amc_contracts(id) ON DELETE SET NULL,
      amount NUMERIC(14, 2) NOT NULL,
      payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      payment_mode VARCHAR(50) NOT NULL DEFAULT 'BANK_TRANSFER',
      reference_number VARCHAR(100),
      notes TEXT,
      recorded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS payments_customer_id_idx ON payments(customer_id);
    CREATE INDEX IF NOT EXISTS payments_sales_invoice_id_idx ON payments(sales_invoice_id);
    CREATE INDEX IF NOT EXISTS payments_amc_contract_id_idx ON payments(amc_contract_id);
    CREATE INDEX IF NOT EXISTS payments_payment_date_idx ON payments(payment_date);
    CREATE INDEX IF NOT EXISTS payments_recorded_by_idx ON payments(recorded_by);
  `);

  console.log('✅ Payments table and sales_invoices.paid_amount successfully initialized!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initPaymentsTables()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to initialize payments tables:', err);
      await pool.end();
      process.exit(1);
    });
}
