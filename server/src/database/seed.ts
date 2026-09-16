import { eq } from 'drizzle-orm';
import { db, pool } from './db.js';
import { users } from './schema/users.js';
import { products } from './schema/products.js';
import { customers, customerDestinations } from './schema/customers.js';
import { tasks } from './schema/tasks.js';
import { attendance } from './schema/attendance.js';
import { leads, leadActivityLogs } from './schema/leads.js';
import { hashPassword } from '../common/auth/password.js';
import { logger } from '../common/logger/logger.js';

import { fileURLToPath } from 'url';

export const seedDatabase = async (): Promise<void> => {
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

    // 3. Seed Sample Customers & Destinations
    const existingCustomers = await db.select().from(customers).limit(1);
    if (existingCustomers.length === 0) {
      const [c1] = await db
        .insert(customers)
        .values({
          name: 'Rajesh Sharma',
          companyName: 'ABC Heavy Engineering Pvt Ltd',
          phone: '+91 98250 12345',
          email: 'rajesh@abchv.com',
          address: 'Plot 45, GIDC Industrial Estate',
          city: 'Vadodara',
          state: 'Gujarat',
          pincode: '390010',
          notes: 'High voltage transformer and industrial generator maintenance client.',
          status: 'ACTIVE',
        })
        .returning();

      if (c1) {
        await db.insert(customerDestinations).values([
          {
            customerId: c1.id,
            name: 'Main Manufacturing Plant',
            address: 'Plot 45-48, Sector B, GIDC Manjusar',
            city: 'Vadodara',
            state: 'Gujarat',
            pincode: '390010',
            latitude: '22.3072000',
            longitude: '73.1812000',
            contactPerson: 'Karan Dave',
            contactPhone: '+91 98250 99881',
            notes: 'Primary generator installation site. Heavy crane required.',
            status: 'ACTIVE',
          },
          {
            customerId: c1.id,
            name: 'Central Warehouse & Spares Depot',
            address: 'Survey 112, Makarpura Industrial Area',
            city: 'Vadodara',
            state: 'Gujarat',
            pincode: '390014',
            latitude: '22.2536000',
            longitude: '73.1944000',
            contactPerson: 'Suresh Parmar',
            contactPhone: '+91 98250 99882',
            notes: 'Delivery entrance from Gate No. 2.',
            status: 'ACTIVE',
          },
        ]);
      }

      const [c2] = await db
        .insert(customers)
        .values({
          name: 'Sunil Mehta',
          companyName: 'Gujarat Solar Tech Parks',
          phone: '+91 98980 54321',
          email: 'mehta@gujaratsolar.org',
          address: 'Solar Park Road, Charanka',
          city: 'Patan',
          state: 'Gujarat',
          pincode: '385340',
          notes: 'Large scale solar farm array and inverter monitoring client.',
          status: 'ACTIVE',
        })
        .returning();

      if (c2) {
        await db.insert(customerDestinations).values([
          {
            customerId: c2.id,
            name: 'Charanka Solar Substation 1',
            address: 'Block A, 50MW Solar Substation Unit',
            city: 'Patan',
            state: 'Gujarat',
            pincode: '385340',
            latitude: '23.9015000',
            longitude: '71.1983000',
            contactPerson: 'Anil Rathod',
            contactPhone: '+91 98980 11223',
            notes: 'High security clearance area.',
            status: 'ACTIVE',
          },
        ]);
      }

      const [c3] = await db
        .insert(customers)
        .values({
          name: 'Priya Iyer',
          companyName: 'Apex Data Centers India',
          phone: '+91 97123 45678',
          email: 'priya.iyer@apexdata.in',
          address: 'GIFT City Tower 2, Zone B',
          city: 'Gandhinagar',
          state: 'Gujarat',
          pincode: '382355',
          notes: 'Critical 24/7 backup power UPS & generator contract.',
          status: 'ACTIVE',
        })
        .returning();

      if (c3) {
        await db.insert(customerDestinations).values([
          {
            customerId: c3.id,
            name: 'GIFT City Tier-4 Data Center',
            address: 'Level -2 Power Bay, GIFT One Tower',
            city: 'Gandhinagar',
            state: 'Gujarat',
            pincode: '382355',
            latitude: '23.1610000',
            longitude: '72.6845000',
            contactPerson: 'Manish Joshi',
            contactPhone: '+91 97123 88990',
            notes: 'Requires visitor pre-registration with ID proof.',
            status: 'ACTIVE',
          },
        ]);
      }
    }

    // 4. Seed Sample Tasks for Employee
    const [employeeUser] = await db.select().from(users).where(eq(users.email, 'employee@tanejapower.com')).limit(1);
    const [adminUser] = await db.select().from(users).where(eq(users.email, 'admin@tanejapower.com')).limit(1);
    const sampleDestinations = await db.select().from(customerDestinations).limit(3);

    if (employeeUser && adminUser && sampleDestinations.length > 0) {
      const existingTasks = await db.select().from(tasks).limit(1);
      if (existingTasks.length === 0) {
        const now = new Date();
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

        await db.insert(tasks).values([
          {
            title: '500kVA Standby Generator Annual Inspection',
            description: 'Perform full mechanical and electrical diagnostics, check acoustic enclosure seals, and test automatic mains failure transfer.',
            customerId: sampleDestinations[0].customerId,
            destinationId: sampleDestinations[0].id,
            assignedTo: employeeUser.id,
            priority: 'HIGH',
            status: 'ASSIGNED',
            scheduledAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // In 2 hours today
            dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
            createdBy: adminUser.id,
          },
          {
            title: 'Solar PV Inverter Telemetry Synchronization',
            description: 'Configure Wi-Fi data logger module and calibrate dual MPPT sensor arrays for grid feed-in compliance.',
            customerId: sampleDestinations[1] ? sampleDestinations[1].customerId : sampleDestinations[0].customerId,
            destinationId: sampleDestinations[1] ? sampleDestinations[1].id : sampleDestinations[0].id,
            assignedTo: employeeUser.id,
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            scheduledAt: now,
            dueAt: tomorrow,
            startedAt: new Date(now.getTime() - 45 * 60 * 1000),
            createdBy: adminUser.id,
          },
          {
            title: 'GIFT City Tier-4 UPS Battery Bank Health Check',
            description: 'Perform cell internal resistance testing and thermal imaging on 48V 200Ah Lithium LiFePO4 rack modules.',
            customerId: sampleDestinations[2] ? sampleDestinations[2].customerId : sampleDestinations[0].customerId,
            destinationId: sampleDestinations[2] ? sampleDestinations[2].id : sampleDestinations[0].id,
            assignedTo: employeeUser.id,
            priority: 'URGENT',
            status: 'ASSIGNED',
            scheduledAt: tomorrow,
            dueAt: new Date(tomorrow.getTime() + 8 * 60 * 60 * 1000),
            createdBy: adminUser.id,
          },
          {
            title: 'Quarterly ATS Switchgear Maintenance & Cleaning',
            description: 'Clean contact points, inspect solenoid coil insulation, and simulate secondary power failover.',
            customerId: sampleDestinations[0].customerId,
            destinationId: sampleDestinations[0].id,
            assignedTo: employeeUser.id,
            priority: 'LOW',
            status: 'COMPLETED',
            scheduledAt: yesterday,
            dueAt: yesterday,
            startedAt: new Date(yesterday.getTime() - 4 * 60 * 60 * 1000),
            completedAt: yesterday,
            createdBy: adminUser.id,
          },
        ]);
      }

      // 5. Seed Attendance History for Employee
      const existingAttendance = await db.select().from(attendance).limit(1);
      if (existingAttendance.length === 0) {
        const todayDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date());

        const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const yesterdayDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(yesterdayDate);

        const twoDaysAgoDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
        const twoDaysAgoDateStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(twoDaysAgoDate);

        await db.insert(attendance).values([
          {
            employeeId: employeeUser.id,
            attendanceDate: todayDateStr,
            checkInAt: new Date(new Date().setHours(9, 0, 0, 0)),
            checkInLatitude: '22.3072',
            checkInLongitude: '73.1812',
            status: 'CHECKED_IN',
            notes: 'Field visit scheduled at GIDC Manjusar plant.',
          },
          {
            employeeId: employeeUser.id,
            attendanceDate: yesterdayDateStr,
            checkInAt: new Date(new Date(yesterdayDate).setHours(8, 45, 0, 0)),
            checkOutAt: new Date(new Date(yesterdayDate).setHours(17, 30, 0, 0)),
            checkInLatitude: '22.3072',
            checkInLongitude: '73.1812',
            checkOutLatitude: '22.3072',
            checkOutLongitude: '73.1812',
            totalMinutes: 525,
            status: 'CHECKED_OUT',
            notes: 'Full day completed. All tasks resolved.',
          },
          {
            employeeId: employeeUser.id,
            attendanceDate: twoDaysAgoDateStr,
            checkInAt: new Date(new Date(twoDaysAgoDate).setHours(9, 15, 0, 0)),
            checkOutAt: new Date(new Date(twoDaysAgoDate).setHours(18, 0, 0, 0)),
            checkInLatitude: '23.1610',
            checkInLongitude: '72.6845',
            checkOutLatitude: '23.1610',
            checkOutLongitude: '72.6845',
            totalMinutes: 525,
            status: 'CHECKED_OUT',
            notes: 'GIFT City Tier-4 data center power failover tests.',
          },
        ]);
      }
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
