import { sql } from 'drizzle-orm';
import { db, pool } from './db.js';
import { fileURLToPath } from 'url';

export async function initFollowUpsTable() {
  console.log('🔄 Initializing Phase C.2 Follow-ups database table...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follow_up_number VARCHAR(50) NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
      scheduled_date VARCHAR(20) NOT NULL,
      scheduled_time VARCHAR(20),
      assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
      created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      lead_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
      deal_id VARCHAR(255) REFERENCES leads(id) ON DELETE CASCADE,
      quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
      amc_contract_id UUID REFERENCES amc_contracts(id) ON DELETE CASCADE,
      completed_at TIMESTAMPTZ,
      completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      outcome TEXT,
      rescheduled_from_id UUID,
      next_follow_up_id UUID,
      next_follow_up_date VARCHAR(20),
      cancelled_at TIMESTAMPTZ,
      cancelled_by UUID REFERENCES users(id) ON DELETE SET NULL,
      cancellation_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS follow_ups_number_idx ON follow_ups (follow_up_number);
    CREATE INDEX IF NOT EXISTS follow_ups_status_idx ON follow_ups (status);
    CREATE INDEX IF NOT EXISTS follow_ups_priority_idx ON follow_ups (priority);
    CREATE INDEX IF NOT EXISTS follow_ups_type_idx ON follow_ups (type);
    CREATE INDEX IF NOT EXISTS follow_ups_scheduled_date_idx ON follow_ups (scheduled_date);
    CREATE INDEX IF NOT EXISTS follow_ups_assigned_to_idx ON follow_ups (assigned_to);
    CREATE INDEX IF NOT EXISTS follow_ups_created_by_idx ON follow_ups (created_by);
    CREATE INDEX IF NOT EXISTS follow_ups_customer_id_idx ON follow_ups (customer_id);
    CREATE INDEX IF NOT EXISTS follow_ups_lead_id_idx ON follow_ups (lead_id);
    CREATE INDEX IF NOT EXISTS follow_ups_deal_id_idx ON follow_ups (deal_id);
    CREATE INDEX IF NOT EXISTS follow_ups_quotation_id_idx ON follow_ups (quotation_id);
    CREATE INDEX IF NOT EXISTS follow_ups_amc_contract_id_idx ON follow_ups (amc_contract_id);
    CREATE INDEX IF NOT EXISTS follow_ups_created_at_idx ON follow_ups (created_at);
  `);

  console.log('✅ Phase C.2 Follow-ups table initialized successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initFollowUpsTable()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('❌ Failed to initialize follow_ups table:', err);
      await pool.end();
      process.exit(1);
    });
}
