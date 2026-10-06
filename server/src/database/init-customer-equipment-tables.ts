import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';

export async function initCustomerEquipmentTables() {
  console.log('🔄 Initializing Customer Equipment / Installed Asset Registry database tables...');

  // 1. customer_equipment table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      asset_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE RESTRICT,
      sales_order_item_id UUID NOT NULL REFERENCES sales_order_items(id) ON DELETE RESTRICT,
      sales_invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
      sales_invoice_item_id UUID REFERENCES sales_invoice_items(id) ON DELETE SET NULL,
      delivery_id UUID NOT NULL REFERENCES dispatches(id) ON DELETE RESTRICT,
      delivery_item_id UUID NOT NULL REFERENCES dispatch_items(id) ON DELETE RESTRICT,
      unit_index INTEGER NOT NULL DEFAULT 1,
      serial_number VARCHAR(100),
      product_name VARCHAR(255) NOT NULL,
      sku VARCHAR(100),
      model VARCHAR(100),
      make VARCHAR(100),
      capacity_rating VARCHAR(100),
      hsn_sac VARCHAR(50),
      destination_id UUID REFERENCES customer_destinations(id) ON DELETE SET NULL,
      installation_location TEXT,
      installation_notes TEXT,
      installation_date TIMESTAMPTZ,
      delivery_date TIMESTAMPTZ NOT NULL,
      warranty_start_date TIMESTAMPTZ,
      warranty_end_date TIMESTAMPTZ,
      warranty_terms_snapshot TEXT,
      condition_status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
      asset_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS customer_equipment_asset_number_idx ON customer_equipment (asset_number);
    CREATE UNIQUE INDEX IF NOT EXISTS customer_equipment_so_unit_unique_idx ON customer_equipment (sales_order_item_id, unit_index);
    CREATE INDEX IF NOT EXISTS customer_equipment_customer_id_idx ON customer_equipment (customer_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_product_id_idx ON customer_equipment (product_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_sales_order_id_idx ON customer_equipment (sales_order_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_sales_order_item_id_idx ON customer_equipment (sales_order_item_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_delivery_id_idx ON customer_equipment (delivery_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_delivery_item_id_idx ON customer_equipment (delivery_item_id);
    CREATE INDEX IF NOT EXISTS customer_equipment_condition_status_idx ON customer_equipment (condition_status);
    CREATE INDEX IF NOT EXISTS customer_equipment_asset_status_idx ON customer_equipment (asset_status);
    CREATE INDEX IF NOT EXISTS customer_equipment_serial_number_idx ON customer_equipment (serial_number);
  `);

  // 2. customer_equipment_sequences table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS customer_equipment_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prefix VARCHAR(20) NOT NULL DEFAULT 'EQ',
      financial_year VARCHAR(20) NOT NULL,
      current_sequence INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT customer_equipment_sequences_prefix_fy_unique UNIQUE (prefix, financial_year)
    );
  `);

  // 3. quotation_item_equipment junction table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quotation_item_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      quotation_item_id UUID NOT NULL REFERENCES quotation_items(id) ON DELETE CASCADE,
      customer_equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS quotation_item_equipment_unique_idx ON quotation_item_equipment (quotation_item_id, customer_equipment_id);
    CREATE INDEX IF NOT EXISTS quotation_item_equipment_item_id_idx ON quotation_item_equipment (quotation_item_id);
    CREATE INDEX IF NOT EXISTS quotation_item_equipment_equipment_id_idx ON quotation_item_equipment (customer_equipment_id);
  `);

  // 4. Downstream AMC table extensions
  await db.execute(sql`
    ALTER TABLE amc_contract_equipment
      ADD COLUMN IF NOT EXISTS customer_equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS amc_contract_equipment_customer_equipment_id_idx ON amc_contract_equipment (customer_equipment_id);

    ALTER TABLE amc_service_requests
      ADD COLUMN IF NOT EXISTS customer_equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS amc_service_requests_customer_equipment_id_idx ON amc_service_requests (customer_equipment_id);

    ALTER TABLE amc_service_report_equipment
      ADD COLUMN IF NOT EXISTS customer_equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS amc_service_report_equipment_customer_equipment_id_idx ON amc_service_report_equipment (customer_equipment_id);
  `);

  console.log('✅ Customer Equipment / Installed Asset Registry database tables initialized successfully.');
}

if (process.argv[1]?.includes('init-customer-equipment-tables')) {
  initCustomerEquipmentTables()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to initialize Customer Equipment tables:', err);
      await pool.end();
      process.exit(1);
    });
}
