import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initEmployeeFields() {
  try {
    await db.execute(sql`
      ALTER TABLE users ALTER COLUMN phone TYPE varchar(255);
    `);
    console.log('✅ Users table phone column size updated to varchar(255).');
  } catch (err: any) {
    console.log('ℹ️ Users table phone column check:', err?.message);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initEmployeeFields()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to update employee fields:', err);
      await pool.end();
      process.exit(1);
    });
}
