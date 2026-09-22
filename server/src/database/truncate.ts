
import { db, pool } from './db.js';
import { logger } from '../common/logger/logger.js';
import { hashPassword } from '../common/auth/password.js';
import { users } from './schema/users.js';

export const truncateAllTables = async (preserveAdminUsers = true): Promise<void> => {
  logger.info('🧹 Truncating all database tables...');

  try {
    // Truncate all tables in public schema dynamically with CASCADE
    await db.execute(
      `DO $$ 
      DECLARE 
        r RECORD;
      BEGIN 
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '__drizzle_migrations') LOOP 
          EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE;'; 
        END LOOP; 
      END $$;`
    );

    logger.info('✅ All tables truncated successfully.');

    if (preserveAdminUsers) {
      logger.info('🔑 Seeding default system user accounts (Admin / Manager / Employee)...');

      const adminPasswordHash = await hashPassword('Admin@123456');
      await db.insert(users).values({
        email: 'admin@tanejapower.com',
        passwordHash: adminPasswordHash,
        fullName: 'System Administrator',
        role: 'ADMIN',
        phone: '+91 98765 43210',
        designation: 'Head of Operations',
        status: 'ACTIVE',
      });

      const managerPasswordHash = await hashPassword('Manager@123456');
      await db.insert(users).values({
        email: 'manager@tanejapower.com',
        passwordHash: managerPasswordHash,
        fullName: 'Vikram Mehta',
        role: 'MANAGER',
        phone: '+91 98765 43211',
        designation: 'Inventory & Operations Manager',
        status: 'ACTIVE',
      });

      const employeePasswordHash = await hashPassword('Employee@123456');
      await db.insert(users).values({
        email: 'employee@tanejapower.com',
        passwordHash: employeePasswordHash,
        fullName: 'John Employee',
        role: 'USER',
        phone: '+91 98765 43212',
        designation: 'Field Service Engineer',
        status: 'ACTIVE',
      });

      logger.info('✅ Default system accounts created successfully.');
    }
  } catch (error) {
    logger.error('❌ Failed to truncate database tables', { error: (error as Error).message });
    throw error;
  }
};

truncateAllTables()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
