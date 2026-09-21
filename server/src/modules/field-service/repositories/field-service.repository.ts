import { eq, and, sql, desc, asc, ilike, or, gte, lte } from 'drizzle-orm';
import { aliasedTable } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  fieldServiceReports,
  fieldServiceSiteObservations,
  fieldServiceBatteryBanks,
  fieldServiceBatteryReadings,
  fieldServiceParts,
  fieldServiceAttachments,
  fieldServiceActivityLogs,
  FieldServiceReportEntity,
  FieldServiceSiteObservationEntity,
  FieldServiceBatteryBankEntity,
  FieldServiceBatteryReadingEntity,
  FieldServicePartEntity,
  FieldServiceAttachmentEntity,
  FieldServiceActivityLogEntity,
} from '../../../database/schema/field-service.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { users } from '../../../database/schema/users.js';
import { products } from '../../../database/schema/products.js';
import { QueryFsrDto } from '../validators/field-service.validator.js';

export interface FsrFilterOptions extends QueryFsrDto {
  allowedServiceEngineerId?: string; // For FSE row-level security
}

export interface FsrWithDetails {
  fsr: FieldServiceReportEntity;
  customer: {
    id: string;
    name: string;
    companyName: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  destination?: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    contactPerson: string | null;
    contactPhone: string | null;
  } | null;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  } | null;
  serviceEngineer: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    designation: string | null;
  };
  createdByUser: {
    id: string;
    fullName: string;
    email: string;
  };
  siteObservation: FieldServiceSiteObservationEntity | null;
  batteryBanks: Array<
    FieldServiceBatteryBankEntity & {
      readings: FieldServiceBatteryReadingEntity[];
    }
  >;
  parts: Array<
    FieldServicePartEntity & {
      product?: {
        id: string;
        name: string;
        sku: string;
      } | null;
    }
  >;
  attachments: FieldServiceAttachmentEntity[];
  activityLogs: Array<
    FieldServiceActivityLogEntity & {
      user?: {
        id: string;
        fullName: string;
        email: string;
      } | null;
    }
  >;
}

// Aliased tables for clean joins
const serviceEngineers = aliasedTable(users, 'service_engineers');
const createdByUsers = aliasedTable(users, 'created_by_users');
const updatedByUsers = aliasedTable(users, 'updated_by_users');
const activityUsers = aliasedTable(users, 'activity_users');
const attachmentUsers = aliasedTable(users, 'attachment_users');

export class FieldServiceRepository {
  /**
   * Find list of FSRs with pagination and filters
   */
  async findAll(options: FsrFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;

    const conditions = [];

    // FSE row-level scoping if restricted
    if (options.allowedServiceEngineerId) {
      conditions.push(eq(fieldServiceReports.serviceEngineerId, options.allowedServiceEngineerId));
    } else if (options.serviceEngineerId && options.serviceEngineerId.trim() !== '') {
      conditions.push(eq(fieldServiceReports.serviceEngineerId, options.serviceEngineerId.trim()));
    }

    if (options.customerId && options.customerId.trim() !== '') {
      conditions.push(eq(fieldServiceReports.customerId, options.customerId.trim()));
    }

    if (options.status) {
      conditions.push(eq(fieldServiceReports.status, options.status));
    }

    if (options.callType) {
      conditions.push(eq(fieldServiceReports.callType, options.callType));
    }

    if (options.warrantyStatus) {
      conditions.push(eq(fieldServiceReports.warrantyStatus, options.warrantyStatus));
    }

    if (options.startDate) {
      conditions.push(gte(fieldServiceReports.visitDate, new Date(options.startDate)));
    }

    if (options.endDate) {
      conditions.push(lte(fieldServiceReports.visitDate, new Date(options.endDate)));
    }

    if (options.serialNumber && options.serialNumber.trim() !== '') {
      conditions.push(ilike(fieldServiceReports.productSerialNumber, `%${options.serialNumber.trim()}%`));
    }

    if (options.search && options.search.trim() !== '') {
      const searchPattern = `%${options.search.trim()}%`;
      conditions.push(
        or(
          ilike(fieldServiceReports.fsrNumber, searchPattern),
          ilike(fieldServiceReports.customerName, searchPattern),
          ilike(fieldServiceReports.productSerialNumber, searchPattern),
          ilike(fieldServiceReports.problemReported, searchPattern),
          ilike(customers.name, searchPattern),
          ilike(customers.companyName, searchPattern),
          ilike(serviceEngineers.fullName, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count Total
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(fieldServiceReports)
      .leftJoin(customers, eq(fieldServiceReports.customerId, customers.id))
      .leftJoin(serviceEngineers, eq(fieldServiceReports.serviceEngineerId, serviceEngineers.id))
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    // Fetch Paginated Rows
    const rows = await db
      .select({
        fsr: fieldServiceReports,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          city: customerDestinations.city,
        },
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
        serviceEngineer: {
          id: serviceEngineers.id,
          fullName: serviceEngineers.fullName,
          email: serviceEngineers.email,
          phone: serviceEngineers.phone,
          designation: serviceEngineers.designation,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
      })
      .from(fieldServiceReports)
      .leftJoin(customers, eq(fieldServiceReports.customerId, customers.id))
      .leftJoin(customerDestinations, eq(fieldServiceReports.destinationId, customerDestinations.id))
      .leftJoin(products, eq(fieldServiceReports.productId, products.id))
      .leftJoin(serviceEngineers, eq(fieldServiceReports.serviceEngineerId, serviceEngineers.id))
      .leftJoin(createdByUsers, eq(fieldServiceReports.createdById, createdByUsers.id))
      .where(whereClause)
      .orderBy(desc(fieldServiceReports.visitDate), desc(fieldServiceReports.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      fsrs: rows,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
      },
    };
  }

  /**
   * Find full FSR details by ID (including site observation, battery banks & cell readings, parts, attachments, activity)
   */
  async findById(id: string): Promise<FsrWithDetails | null> {
    const [baseRow] = await db
      .select({
        fsr: fieldServiceReports,
        customer: {
          id: customers.id,
          name: customers.name,
          companyName: customers.companyName,
          phone: customers.phone,
          email: customers.email,
          address: customers.address,
        },
        destination: {
          id: customerDestinations.id,
          name: customerDestinations.name,
          address: customerDestinations.address,
          city: customerDestinations.city,
          contactPerson: customerDestinations.contactPerson,
          contactPhone: customerDestinations.contactPhone,
        },
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
          category: products.category,
        },
        serviceEngineer: {
          id: serviceEngineers.id,
          fullName: serviceEngineers.fullName,
          email: serviceEngineers.email,
          phone: serviceEngineers.phone,
          designation: serviceEngineers.designation,
        },
        createdByUser: {
          id: createdByUsers.id,
          fullName: createdByUsers.fullName,
          email: createdByUsers.email,
        },
      })
      .from(fieldServiceReports)
      .leftJoin(customers, eq(fieldServiceReports.customerId, customers.id))
      .leftJoin(customerDestinations, eq(fieldServiceReports.destinationId, customerDestinations.id))
      .leftJoin(products, eq(fieldServiceReports.productId, products.id))
      .leftJoin(serviceEngineers, eq(fieldServiceReports.serviceEngineerId, serviceEngineers.id))
      .leftJoin(createdByUsers, eq(fieldServiceReports.createdById, createdByUsers.id))
      .where(eq(fieldServiceReports.id, id))
      .limit(1);

    if (!baseRow || !baseRow.fsr) {
      return null;
    }

    // 1. Fetch Site Observation
    const [siteObservation] = await db
      .select()
      .from(fieldServiceSiteObservations)
      .where(eq(fieldServiceSiteObservations.fsrId, id))
      .limit(1);

    // 2. Fetch Battery Banks & nested Battery Readings
    const batteryBanks = await db
      .select()
      .from(fieldServiceBatteryBanks)
      .where(eq(fieldServiceBatteryBanks.fsrId, id))
      .orderBy(asc(fieldServiceBatteryBanks.bankNumber));

    const allReadings = await db
      .select()
      .from(fieldServiceBatteryReadings)
      .where(eq(fieldServiceBatteryReadings.fsrId, id))
      .orderBy(asc(fieldServiceBatteryReadings.batteryNumber));

    const batteryBanksWithReadings = batteryBanks.map((bank) => ({
      ...bank,
      readings: allReadings.filter((r) => r.batteryBankId === bank.id),
    }));

    // 3. Fetch Parts Replacement
    const partRows = await db
      .select({
        part: fieldServiceParts,
        product: {
          id: products.id,
          name: products.name,
          sku: products.sku,
        },
      })
      .from(fieldServiceParts)
      .leftJoin(products, eq(fieldServiceParts.productId, products.id))
      .where(eq(fieldServiceParts.fsrId, id))
      .orderBy(asc(fieldServiceParts.createdAt));

    const parts = partRows.map((row) => ({
      ...row.part,
      product: row.product?.id ? row.product : null,
    }));

    // 4. Fetch Attachments
    const attachments = await db
      .select()
      .from(fieldServiceAttachments)
      .where(eq(fieldServiceAttachments.fsrId, id))
      .orderBy(desc(fieldServiceAttachments.createdAt));

    // 5. Fetch Activity Logs
    const activityRows = await db
      .select({
        log: fieldServiceActivityLogs,
        user: {
          id: activityUsers.id,
          fullName: activityUsers.fullName,
          email: activityUsers.email,
        },
      })
      .from(fieldServiceActivityLogs)
      .leftJoin(activityUsers, eq(fieldServiceActivityLogs.userId, activityUsers.id))
      .where(eq(fieldServiceActivityLogs.fsrId, id))
      .orderBy(desc(fieldServiceActivityLogs.createdAt));

    const activityLogs = activityRows.map((a) => ({
      ...a.log,
      user: a.user?.id ? a.user : null,
    }));

    return {
      fsr: baseRow.fsr,
      customer: baseRow.customer!,
      destination: baseRow.destination?.id ? baseRow.destination : null,
      product: baseRow.product?.id ? baseRow.product : null,
      serviceEngineer: baseRow.serviceEngineer!,
      createdByUser: baseRow.createdByUser!,
      siteObservation: siteObservation || null,
      batteryBanks: batteryBanksWithReadings,
      parts,
      attachments,
      activityLogs,
    };
  }

  /**
   * Find battery bank by ID
   */
  async findBatteryBankById(fsrId: string, bankId: string) {
    const [bank] = await db
      .select()
      .from(fieldServiceBatteryBanks)
      .where(
        and(
          eq(fieldServiceBatteryBanks.fsrId, fsrId),
          eq(fieldServiceBatteryBanks.id, bankId)
        )
      )
      .limit(1);

    if (!bank) return null;

    const readings = await db
      .select()
      .from(fieldServiceBatteryReadings)
      .where(eq(fieldServiceBatteryReadings.batteryBankId, bankId))
      .orderBy(asc(fieldServiceBatteryReadings.batteryNumber));

    return {
      ...bank,
      readings,
    };
  }

  /**
   * Find battery reading by ID
   */
  async findBatteryReadingById(fsrId: string, bankId: string, readingId: string) {
    const [reading] = await db
      .select()
      .from(fieldServiceBatteryReadings)
      .where(
        and(
          eq(fieldServiceBatteryReadings.fsrId, fsrId),
          eq(fieldServiceBatteryReadings.batteryBankId, bankId),
          eq(fieldServiceBatteryReadings.id, readingId)
        )
      )
      .limit(1);

    return reading || null;
  }

  /**
   * Find battery reading by battery number inside bank
   */
  async findBatteryReadingByNumber(bankId: string, batteryNumber: number) {
    const [reading] = await db
      .select()
      .from(fieldServiceBatteryReadings)
      .where(
        and(
          eq(fieldServiceBatteryReadings.batteryBankId, bankId),
          eq(fieldServiceBatteryReadings.batteryNumber, batteryNumber)
        )
      )
      .limit(1);

    return reading || null;
  }

  /**
   * Find part by ID
   */
  async findPartById(fsrId: string, partId: string) {
    const [part] = await db
      .select()
      .from(fieldServiceParts)
      .where(
        and(
          eq(fieldServiceParts.fsrId, fsrId),
          eq(fieldServiceParts.id, partId)
        )
      )
      .limit(1);

    return part || null;
  }

  /**
   * Find attachment by ID
   */
  async findAttachmentById(fsrId: string, attachmentId: string) {
    const [attachment] = await db
      .select()
      .from(fieldServiceAttachments)
      .where(
        and(
          eq(fieldServiceAttachments.fsrId, fsrId),
          eq(fieldServiceAttachments.id, attachmentId)
        )
      )
      .limit(1);

    return attachment || null;
  }

  /**
   * Find activity log history for an FSR
   */
  async findActivityLogs(fsrId: string) {
    const rows = await db
      .select({
        log: fieldServiceActivityLogs,
        user: {
          id: activityUsers.id,
          fullName: activityUsers.fullName,
          email: activityUsers.email,
        },
      })
      .from(fieldServiceActivityLogs)
      .leftJoin(activityUsers, eq(fieldServiceActivityLogs.userId, activityUsers.id))
      .where(eq(fieldServiceActivityLogs.fsrId, fsrId))
      .orderBy(desc(fieldServiceActivityLogs.createdAt));

    return rows.map((a) => ({
      ...a.log,
      user: a.user?.id ? a.user : null,
    }));
  }
}
