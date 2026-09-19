import { sql } from 'drizzle-orm';
import { db } from './db.js';

export async function initAmcContractTables() {
  console.log('🔄 Initializing Phase 5 AMC Contract & Service Report database tables...');

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS amc_contracts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_number VARCHAR(100) NOT NULL UNIQUE,
      quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
      quotation_revision_id UUID NOT NULL REFERENCES quotation_revisions(id) ON DELETE RESTRICT,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      destination_id UUID REFERENCES customer_destinations(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      company_name VARCHAR(255),
      end_user VARCHAR(255),
      customer_code VARCHAR(100),
      branch VARCHAR(100),
      zone VARCHAR(100),
      amc_plan VARCHAR(100) NOT NULL,
      contract_start_date TIMESTAMPTZ NOT NULL,
      contract_end_date TIMESTAMPTZ NOT NULL,
      service_frequency VARCHAR(50) NOT NULL,
      scheduled_visits INTEGER NOT NULL DEFAULT 4,
      completed_visits INTEGER NOT NULL DEFAULT 0,
      breakdown_visit_type VARCHAR(50) NOT NULL DEFAULT 'UNLIMITED',
      status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ACTIVATION',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
      special_clauses TEXT,
      amc_payment_terms TEXT,
      termination_reason TEXT,
      terminated_at TIMESTAMPTZ,
      created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_contract_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      quotation_item_id UUID REFERENCES quotation_items(id) ON DELETE SET NULL,
      equipment_type VARCHAR(100),
      equipment_name VARCHAR(255) NOT NULL,
      configuration VARCHAR(100),
      rating VARCHAR(100),
      make VARCHAR(100),
      model VARCHAR(100),
      quantity NUMERIC(10, 3) NOT NULL DEFAULT 1.000,
      unit_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
      line_total NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_contract_scope_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_contract_exclusions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_contract_escalations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      level VARCHAR(20) NOT NULL,
      contact_name VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_service_visits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      visit_number INTEGER NOT NULL,
      scheduled_date TIMESTAMPTZ NOT NULL,
      service_type VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVE',
      status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
      assigned_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      actual_start_at TIMESTAMPTZ,
      actual_end_at TIMESTAMPTZ,
      technician_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      technician_notes TEXT,
      customer_remarks TEXT,
      visit_outcome VARCHAR(50),
      completed_by UUID REFERENCES users(id) ON DELETE SET NULL,
      completed_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      cancelled_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS actual_start_at TIMESTAMPTZ;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS actual_end_at TIMESTAMPTZ;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS technician_employee_id UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS technician_notes TEXT;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS customer_remarks TEXT;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS visit_outcome VARCHAR(50);
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
    ALTER TABLE amc_service_visits ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS amc_service_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      request_number VARCHAR(100) NOT NULL UNIQUE,
      service_type VARCHAR(50) NOT NULL DEFAULT 'BREAKDOWN',
      issue_description TEXT NOT NULL,
      priority VARCHAR(50) NOT NULL DEFAULT 'HIGH',
      status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
      requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      assigned_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
      resolved_at TIMESTAMPTZ,
      notes TEXT,
      created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_service_reports (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      amc_contract_id UUID NOT NULL REFERENCES amc_contracts(id) ON DELETE CASCADE,
      amc_service_visit_id UUID NOT NULL REFERENCES amc_service_visits(id) ON DELETE CASCADE,
      report_number VARCHAR(100) NOT NULL UNIQUE,
      service_type VARCHAR(50) NOT NULL DEFAULT 'PREVENTIVE',
      status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
      inspection_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      technician_employee_id UUID REFERENCES users(id) ON DELETE SET NULL,
      service_summary TEXT,
      observations TEXT,
      recommendations TEXT,
      customer_name VARCHAR(255),
      customer_remarks TEXT,
      acknowledgement_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
      acknowledged_at TIMESTAMPTZ,
      customer_signature_ref TEXT,
      created_by_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      updated_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS amc_service_reports_visit_unique_idx ON amc_service_reports(amc_service_visit_id);

    CREATE TABLE IF NOT EXISTS amc_service_report_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_report_id UUID NOT NULL REFERENCES amc_service_reports(id) ON DELETE CASCADE,
      scope_item_id UUID REFERENCES amc_contract_scope_items(id) ON DELETE SET NULL,
      scope_description TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
      remarks TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_service_report_equipment (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_report_id UUID NOT NULL REFERENCES amc_service_reports(id) ON DELETE CASCADE,
      equipment_id UUID REFERENCES amc_contract_equipment(id) ON DELETE SET NULL,
      equipment_name VARCHAR(255) NOT NULL,
      configuration VARCHAR(100),
      rating VARCHAR(100),
      condition_status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL',
      observations TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_service_report_attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_report_id UUID NOT NULL REFERENCES amc_service_reports(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      file_type VARCHAR(100) NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS amc_sequences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prefix VARCHAR(50) NOT NULL DEFAULT 'AMC',
      financial_year VARCHAR(20) NOT NULL,
      current_sequence INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS amc_sequences_prefix_year_unique_idx ON amc_sequences(prefix, financial_year);
  `);

  console.log('✅ Phase 5 AMC Contract & Service Report database tables initialized successfully!');
}

if (process.argv[1]?.includes('init-amc-contracts-tables')) {
  initAmcContractTables().then(() => process.exit(0)).catch((err) => {
    console.error('❌ Table init failed:', err);
    process.exit(1);
  });
}
