import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initCustomerCreatedBy() {
  try {
    await db.execute(sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_id uuid REFERENCES users(id) ON DELETE SET NULL;
    `);
    console.log('✅ Added created_by_id column to customers table.');

    await db.execute(sql`
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by varchar(255);
    `);
    console.log('✅ Added created_by column to customers table.');

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS customers_created_by_id_idx ON customers(created_by_id);
    `);
    console.log('✅ Created index on customers(created_by_id).');
  } catch (err: any) {
    console.log('ℹ️ Customer created_by columns check:', err?.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initCustomerCreatedBy()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to update customer created_by fields:', err);
      await pool.end();
      process.exit(1);
    });
}
