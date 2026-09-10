import { db, pool } from './db.js';
import { users } from './schema/users.js';
import { products } from './schema/products.js';
import { hashPassword } from '../common/auth/password.js';
import { logger } from '../common/logger/logger.js';

export const seedDatabase = async (): Promise<void> => {
  logger.info('🌱 Starting database seed...');

  try {
    // 1. Seed Admin User
    const adminPasswordHash = await hashPassword('Admin@123456');
    await db.insert(users).values({
      email: 'admin@tanejapower.com',
      passwordHash: adminPasswordHash,
      fullName: 'System Administrator',
      role: 'ADMIN',
    }).onConflictDoNothing();

    // 2. Seed Sample Products
    const sampleProducts = [
      {
        name: 'High Performance Diesel Generator 500kVA',
        sku: 'GEN-DSL-500K',
        description: 'Industrial heavy-duty 500kVA standby diesel generator with acoustic enclosure.',
        category: 'Generators',
        price: '45000.00',
        stockQuantity: 12,
        status: 'ACTIVE',
      },
      {
        name: 'Solar Inverter 10kW Hybrid',
        sku: 'INV-SLR-10K',
        description: 'Three-phase smart hybrid solar inverter with dual MPPT trackers and Wi-Fi monitoring.',
        category: 'Inverters',
        price: '2800.00',
        stockQuantity: 35,
        status: 'ACTIVE',
      },
      {
        name: 'Lithium LiFePO4 Energy Storage 48V 200Ah',
        sku: 'BAT-LIFE-48V',
        description: 'Server rack mountable deep cycle Lithium Iron Phosphate energy storage system.',
        category: 'Batteries',
        price: '3200.00',
        stockQuantity: 20,
        status: 'ACTIVE',
      },
      {
        name: 'Automatic Transfer Switch (ATS) 400A 4P',
        sku: 'ATS-400A-4P',
        description: 'Seamless automatic mains failure switch for generator/grid changeover.',
        category: 'Switchgear',
        price: '1450.00',
        stockQuantity: 8,
        status: 'ACTIVE',
      },
      {
        name: 'Industrial Monocrystalline Solar Panel 550W',
        sku: 'PNL-MONO-550W',
        description: 'High efficiency bifacial monocrystalline PV module with tempered anti-reflective glass.',
        category: 'Solar Panels',
        price: '190.00',
        stockQuantity: 150,
        status: 'ACTIVE',
      },
    ];

    for (const prod of sampleProducts) {
      await db.insert(products).values(prod).onConflictDoNothing();
    }

    logger.info(' Database seeding completed successfully.');
  } catch (error) {
    logger.error('Database seeding failed', { error: (error as Error).message });
    throw error;
  }
};

if (process.argv[1] === import.meta.url) {
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
