import { db, pool } from './db.js';
import { users } from './schema/users.js';
import { hashPassword } from '../common/auth/password.js';
import { logger } from '../common/logger/logger.js';
import { env } from '../config/env.js';

import { fileURLToPath } from 'url';

export const seedDatabase = async (): Promise<void> => {
  if (env.isProduction && !env.ALLOW_PRODUCTION_SEED) {
    logger.error('CRITICAL: Database seeding is blocked in production mode! Set ALLOW_PRODUCTION_SEED=true to override.');
    throw new Error('Database seeding blocked in production mode');
  }

  logger.info('🌱 Starting database seed...');

  try {
    // 1. Seed Admin & Employee Users
    const adminPasswordHash = await hashPassword('Admin@123456');
    await db.insert(users).values({
      email: 'admin@tanejapower.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      role: 'ADMIN',
      phone: '+91 98765 43210',
      designation: 'Head of Operations',
      status: 'ACTIVE',
    }).onConflictDoNothing();

    const managerPasswordHash = await hashPassword('Manager@123456');
    await db.insert(users).values({
      email: 'manager@tanejapower.com',
      passwordHash: managerPasswordHash,
      fullName: 'Vikram Mehta',
      role: 'MANAGER',
      phone: '+91 98765 43211',
      designation: 'Inventory & Operations Manager',
      status: 'ACTIVE',
    }).onConflictDoNothing();

    const employeePasswordHash = await hashPassword('Employee@123456');
    await db.insert(users).values({
      email: 'employee@tanejapower.com',
      passwordHash: employeePasswordHash,
      fullName: 'John Employee',
      role: 'USER',
      phone: '+91 98765 43212',
      designation: 'Field Service Engineer',
      status: 'ACTIVE',
    }).onConflictDoNothing();

    const rahulPasswordHash = await hashPassword('Rahul@123456');
    await db.insert(users).values({
      email: 'rahul.patel@tanejapower.com',
      passwordHash: rahulPasswordHash,
      fullName: 'Rahul Patel',
      role: 'USER',
      phone: '+91 98765 43213',
      designation: 'Solar Technician',
      status: 'ACTIVE',
    }).onConflictDoNothing();

    // 2. Automatically Seed Product Catalogue from Master Excel if available
    try {
      const { excelCatalogueImporterService } = await import('../modules/products/services/excel-catalogue-importer.service.js');
      logger.info('📦 Seeding product catalogue from master Excel workbook...');
      const excelResult = await excelCatalogueImporterService.importFromFile(undefined, {
        mode: 'skip_existing',
      });
      logger.info(`📦 Product catalogue seeded: ${excelResult.insertedCount} inserted, ${excelResult.skippedCount} skipped.`);
    } catch (excelErr: any) {
      logger.warn(`Master Excel workbook could not be seeded during general seed: ${excelErr.message}`);
    }

    logger.info(' Database seeding completed successfully.');
  } catch (error) {
    logger.error('Database seeding failed', { error: (error as Error).message });
    throw error;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedDatabase()
    .then(async () => {
      await pool.end();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await pool.end();
      process.exit(1);
    });
}
