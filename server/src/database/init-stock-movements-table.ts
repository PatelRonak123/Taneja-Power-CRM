/**
 * @deprecated TEST/DEV ONLY UTILITY
 * 
 * DO NOT USE IN PRODUCTION.
 * Schema migrations must be applied exclusively via `npm run db:migrate` (Drizzle migrator)
 * which tracks schema versions in `drizzle.__drizzle_migrations`.
 * 
 * This file is retained strictly as a development/test helper when running ephemeral test DBs.
 */
import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initStockMovementsTableDevOnly() {
  console.warn('⚠️ [DEV-ONLY] initStockMovementsTableDevOnly called. Production migrations should use "npm run db:migrate".');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      movement_type VARCHAR(50) NOT NULL,
      quantity INTEGER NOT NULL,
      previous_quantity INTEGER NOT NULL,
      new_quantity INTEGER NOT NULL,
      reference_type VARCHAR(50) NOT NULL,
      reference_id VARCHAR(255),
      reason TEXT,
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON stock_movements (product_id);
    CREATE INDEX IF NOT EXISTS stock_movements_movement_type_idx ON stock_movements (movement_type);
    CREATE INDEX IF NOT EXISTS stock_movements_reference_type_idx ON stock_movements (reference_type);
    CREATE INDEX IF NOT EXISTS stock_movements_reference_id_idx ON stock_movements (reference_id);
    CREATE INDEX IF NOT EXISTS stock_movements_created_at_idx ON stock_movements (created_at);
  `);

  console.log('✅ Dev-only stock_movements table checked/verified.');
}

// Keep export for backwards compatibility with any test harness
export const initStockMovementsTable = initStockMovementsTableDevOnly;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initStockMovementsTableDevOnly()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to run dev-only stock_movements init:', err);
      await pool.end();
      process.exit(1);
    });
}
