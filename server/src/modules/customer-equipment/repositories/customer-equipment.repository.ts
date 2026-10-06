import { eq, and, sql, desc, asc, or, ilike, inArray, aliasedTable } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  customerEquipment,
  CustomerEquipmentEntity,
  NewCustomerEquipmentEntity,
} from '../../../database/schema/customer-equipment.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { products } from '../../../database/schema/products.js';
import { salesOrders } from '../../../database/schema/sales-orders.js';
import { salesInvoices } from '../../../database/schema/invoices.js';
import { dispatches } from '../../../database/schema/dispatch.js';
import { amcContracts, amcContractEquipment, amcServiceRequests, amcServiceReportEquipment, amcServiceReports, amcServiceVisits } from '../../../database/schema/amc-contracts.js';
import { tasks } from '../../../database/schema/tasks.js';
import { users } from '../../../database/schema/users.js';
import { ListCustomerEquipmentQuery, UpdateCustomerEquipmentInput } from '../validators/customer-equipment.validator.js';

export class CustomerEquipmentRepository {
  async findAll(query: ListCustomerEquipmentQuery, txClient: any = db) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.customerId) {
      conditions.push(eq(customerEquipment.customerId, query.customerId));
    }

    if (query.productId) {
      conditions.push(eq(customerEquipment.productId, query.productId));
    }

    if (query.conditionStatus) {
      conditions.push(eq(customerEquipment.conditionStatus, query.conditionStatus));
    }

    if (query.assetStatus) {
      conditions.push(eq(customerEquipment.assetStatus, query.assetStatus));
    }

    if (query.serialNumber) {
      conditions.push(ilike(customerEquipment.serialNumber, `%${query.serialNumber}%`));
    }

    if (query.search) {
      const s = `%${query.search}%`;
      conditions.push(
        or(
          ilike(customerEquipment.assetNumber, s),
          ilike(customerEquipment.productName, s),
          ilike(customerEquipment.serialNumber, s),
          ilike(customerEquipment.sku, s)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total count query
    const [countResult] = await txClient
      .select({ count: sql<number>`count(*)::int` })
      .from(customerEquipment)
      .where(whereClause);

    const total = countResult?.count || 0;

    // Sorting
    let sortColumn: any = customerEquipment.deliveryDate;
    if (query.sortBy === 'assetNumber') sortColumn = customerEquipment.assetNumber;
    else if (query.sortBy === 'createdAt') sortColumn = customerEquipment.createdAt;
    else if (query.sortBy === 'productName') sortColumn = customerEquipment.productName;

    const orderFn = query.sortOrder === 'asc' ? asc : desc;

    // Data query with joins
    const rows = await txClient
      .select({
        id: customerEquipment.id,
        assetNumber: customerEquipment.assetNumber,
        customerId: customerEquipment.customerId,
        customerName: customers.name,
        customerCompanyName: customers.companyName,
        productId: customerEquipment.productId,
        productName: customerEquipment.productName,
        sku: customerEquipment.sku,
        model: customerEquipment.model,
        make: customerEquipment.make,
        capacityRating: customerEquipment.capacityRating,
        serialNumber: customerEquipment.serialNumber,
        unitIndex: customerEquipment.unitIndex,
        deliveryId: customerEquipment.deliveryId,
        deliveryNumber: dispatches.dispatchNumber,
        deliveryChallanNumber: dispatches.deliveryChallanNumber,
        salesOrderId: customerEquipment.salesOrderId,
        salesOrderNumber: salesOrders.salesOrderNumber,
        salesInvoiceId: customerEquipment.salesInvoiceId,
        destinationId: customerEquipment.destinationId,
        destinationName: customerDestinations.name,
        installationLocation: customerEquipment.installationLocation,
        installationDate: customerEquipment.installationDate,
        deliveryDate: customerEquipment.deliveryDate,
        warrantyStartDate: customerEquipment.warrantyStartDate,
        warrantyEndDate: customerEquipment.warrantyEndDate,
        conditionStatus: customerEquipment.conditionStatus,
        assetStatus: customerEquipment.assetStatus,
        createdAt: customerEquipment.createdAt,
        updatedAt: customerEquipment.updatedAt,
      })
      .from(customerEquipment)
      .leftJoin(customers, eq(customers.id, customerEquipment.customerId))
      .leftJoin(customerDestinations, eq(customerDestinations.id, customerEquipment.destinationId))
      .leftJoin(salesOrders, eq(salesOrders.id, customerEquipment.salesOrderId))
      .leftJoin(dispatches, eq(dispatches.id, customerEquipment.deliveryId))
      .where(whereClause)
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset);

    // Attach active AMC status for each row
    const equipmentIds = rows.map((r: any) => r.id);
    let activeAmcMap: Record<string, { contractId: string; contractNumber: string; status: string; endDate: string }> = {};

    if (equipmentIds.length > 0) {
      const activeAmcs = await txClient
        .select({
          equipmentId: amcContractEquipment.customerEquipmentId,
          contractId: amcContracts.id,
          contractNumber: amcContracts.contractNumber,
          status: amcContracts.status,
          endDate: amcContracts.contractEndDate,
        })
        .from(amcContractEquipment)
        .innerJoin(amcContracts, eq(amcContracts.id, amcContractEquipment.amcContractId))
        .where(
          and(
            inArray(amcContractEquipment.customerEquipmentId, equipmentIds),
            eq(amcContracts.status, 'ACTIVE')
          )
        );

      for (const a of activeAmcs) {
        if (a.equipmentId && !activeAmcMap[a.equipmentId]) {
          activeAmcMap[a.equipmentId] = {
            contractId: a.contractId,
            contractNumber: a.contractNumber,
            status: a.status,
            endDate: a.endDate?.toISOString?.() || String(a.endDate),
          };
        }
      }
    }

    const data = rows.map((r: any) => ({
      ...r,
      activeAmc: activeAmcMap[r.id] || null,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(id: string, txClient: any = db) {
    const [row] = await txClient
      .select({
        id: customerEquipment.id,
        assetNumber: customerEquipment.assetNumber,
        customerId: customerEquipment.customerId,
        customerName: customers.name,
        customerCompanyName: customers.companyName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
        productId: customerEquipment.productId,
        productName: customerEquipment.productName,
        productPrice: products.price,
        productCategory: products.category,
        sku: customerEquipment.sku,
        model: customerEquipment.model,
        make: customerEquipment.make,
        capacityRating: customerEquipment.capacityRating,
        hsnSac: customerEquipment.hsnSac,
        serialNumber: customerEquipment.serialNumber,
        unitIndex: customerEquipment.unitIndex,
        deliveryId: customerEquipment.deliveryId,
        deliveryNumber: dispatches.dispatchNumber,
        deliveryChallanNumber: dispatches.deliveryChallanNumber,
        deliveryDate: customerEquipment.deliveryDate,
        salesOrderId: customerEquipment.salesOrderId,
        salesOrderNumber: salesOrders.salesOrderNumber,
        salesInvoiceId: customerEquipment.salesInvoiceId,
        salesInvoiceNumber: salesInvoices.invoiceNumber,
        destinationId: customerEquipment.destinationId,
        destinationName: customerDestinations.name,
        destinationAddress: customerDestinations.address,
        destinationCity: customerDestinations.city,
        destinationState: customerDestinations.state,
        destinationPincode: customerDestinations.pincode,
        installationLocation: customerEquipment.installationLocation,
        installationNotes: customerEquipment.installationNotes,
        installationDate: customerEquipment.installationDate,
        warrantyStartDate: customerEquipment.warrantyStartDate,
        warrantyEndDate: customerEquipment.warrantyEndDate,
        warrantyTermsSnapshot: customerEquipment.warrantyTermsSnapshot,
        conditionStatus: customerEquipment.conditionStatus,
        assetStatus: customerEquipment.assetStatus,
        createdAt: customerEquipment.createdAt,
        updatedAt: customerEquipment.updatedAt,
      })
      .from(customerEquipment)
      .leftJoin(customers, eq(customers.id, customerEquipment.customerId))
      .leftJoin(products, eq(products.id, customerEquipment.productId))
      .leftJoin(customerDestinations, eq(customerDestinations.id, customerEquipment.destinationId))
      .leftJoin(salesOrders, eq(salesOrders.id, customerEquipment.salesOrderId))
      .leftJoin(salesInvoices, eq(salesInvoices.id, customerEquipment.salesInvoiceId))
      .leftJoin(dispatches, eq(dispatches.id, customerEquipment.deliveryId))
      .where(eq(customerEquipment.id, id))
      .limit(1);

    if (!row) return null;

    // Load active AMC info if any
    const [activeAmc] = await txClient
      .select({
        contractId: amcContracts.id,
        contractNumber: amcContracts.contractNumber,
        status: amcContracts.status,
        amcPlan: amcContracts.amcPlan,
        contractStartDate: amcContracts.contractStartDate,
        contractEndDate: amcContracts.contractEndDate,
      })
      .from(amcContractEquipment)
      .innerJoin(amcContracts, eq(amcContracts.id, amcContractEquipment.amcContractId))
      .where(
        and(
          eq(amcContractEquipment.customerEquipmentId, id),
          eq(amcContracts.status, 'ACTIVE')
        )
      )
      .limit(1);

    const serviceHistory = await this.getServiceHistory(id, txClient);

    return {
      ...row,
      activeAmc: activeAmc || null,
      serviceRequests: serviceHistory.serviceRequests,
      serviceVisits: serviceHistory.serviceVisits,
      inspections: serviceHistory.inspections,
    };
  }

  async findByCustomerId(customerId: string, txClient: any = db) {
    const rows = await txClient
      .select({
        id: customerEquipment.id,
        assetNumber: customerEquipment.assetNumber,
        productId: customerEquipment.productId,
        productName: customerEquipment.productName,
        sku: customerEquipment.sku,
        model: customerEquipment.model,
        make: customerEquipment.make,
        capacityRating: customerEquipment.capacityRating,
        serialNumber: customerEquipment.serialNumber,
        destinationId: customerEquipment.destinationId,
        destinationName: customerDestinations.name,
        installationLocation: customerEquipment.installationLocation,
        conditionStatus: customerEquipment.conditionStatus,
        assetStatus: customerEquipment.assetStatus,
        deliveryDate: customerEquipment.deliveryDate,
      })
      .from(customerEquipment)
      .leftJoin(customerDestinations, eq(customerDestinations.id, customerEquipment.destinationId))
      .where(
        and(
          eq(customerEquipment.customerId, customerId),
          eq(customerEquipment.assetStatus, 'ACTIVE')
        )
      )
      .orderBy(asc(customerEquipment.assetNumber));

    // Get active AMC contract references for this customer's equipment
    const equipmentIds = rows.map((r: any) => r.id);
    let activeAmcSet: Set<string> = new Set();

    if (equipmentIds.length > 0) {
      const activeAmcs = await txClient
        .select({
          equipmentId: amcContractEquipment.customerEquipmentId,
        })
        .from(amcContractEquipment)
        .innerJoin(amcContracts, eq(amcContracts.id, amcContractEquipment.amcContractId))
        .where(
          and(
            inArray(amcContractEquipment.customerEquipmentId, equipmentIds),
            eq(amcContracts.status, 'ACTIVE')
          )
        );

      for (const a of activeAmcs) {
        if (a.equipmentId) activeAmcSet.add(a.equipmentId);
      }
    }

    return rows.map((r: any) => ({
      ...r,
      isCoveredByActiveAmc: activeAmcSet.has(r.id),
    }));
  }

  async getServiceHistory(equipmentId: string, txClient: any = db) {
    const requestTechnicians = aliasedTable(users, 'request_technicians');
    const taskTechnicians = aliasedTable(users, 'task_technicians');

    // 1. Service Requests for this asset (direct match OR via contract equipment)
    const requests = await txClient
      .select({
        id: amcServiceRequests.id,
        requestNumber: amcServiceRequests.requestNumber,
        serviceType: amcServiceRequests.serviceType,
        issueDescription: amcServiceRequests.issueDescription,
        priority: amcServiceRequests.priority,
        status: amcServiceRequests.status,
        coverageType: amcServiceRequests.coverageType,
        coverageNotes: amcServiceRequests.coverageNotes,
        coverageDecidedAt: amcServiceRequests.coverageDecidedAt,
        requestedAt: amcServiceRequests.requestedAt,
        resolvedAt: amcServiceRequests.resolvedAt,
        amcContractId: amcServiceRequests.amcContractId,
        contractNumber: amcContracts.contractNumber,
        taskId: amcServiceRequests.taskId,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        taskPriority: tasks.priority,
        taskCompletedAt: tasks.completedAt,
        technicianName: sql<string>`COALESCE(${taskTechnicians.fullName}, ${requestTechnicians.fullName})`,
        technicianEmail: sql<string>`COALESCE(${taskTechnicians.email}, ${requestTechnicians.email})`,
        createdAt: amcServiceRequests.createdAt,
      })
      .from(amcServiceRequests)
      .leftJoin(amcContracts, eq(amcContracts.id, amcServiceRequests.amcContractId))
      .leftJoin(tasks, eq(tasks.id, amcServiceRequests.taskId))
      .leftJoin(requestTechnicians, eq(requestTechnicians.id, amcServiceRequests.assignedEmployeeId))
      .leftJoin(taskTechnicians, eq(taskTechnicians.id, tasks.assignedTo))
      .leftJoin(amcContractEquipment, eq(amcContractEquipment.id, amcServiceRequests.equipmentId))
      .where(
        or(
          eq(amcServiceRequests.customerEquipmentId, equipmentId),
          eq(amcContractEquipment.customerEquipmentId, equipmentId)
        )
      )
      .orderBy(desc(amcServiceRequests.requestedAt));

    // 2. Service Reports / Visit Inspections for this asset
    const visitTechnicians = aliasedTable(users, 'visit_technicians');
    const reportTechnicians = aliasedTable(users, 'report_technicians');

    const reports = await txClient
      .select({
        id: amcServiceReports.id,
        reportNumber: amcServiceReports.reportNumber,
        inspectionDate: amcServiceReports.inspectionDate,
        serviceType: amcServiceReports.serviceType,
        status: amcServiceReports.status,
        conditionStatus: amcServiceReportEquipment.conditionStatus,
        observations: amcServiceReportEquipment.observations,
        serviceSummary: amcServiceReports.serviceSummary,
        contractNumber: amcContracts.contractNumber,
        visitId: amcServiceVisits.id,
        visitNumber: amcServiceVisits.visitNumber,
        visitStatus: amcServiceVisits.status,
        visitOutcome: amcServiceVisits.visitOutcome,
        visitScheduledDate: amcServiceVisits.scheduledDate,
        visitCompletedAt: amcServiceVisits.completedAt,
        technicianName: sql<string>`COALESCE(${reportTechnicians.fullName}, ${visitTechnicians.fullName})`,
      })
      .from(amcServiceReportEquipment)
      .innerJoin(amcServiceReports, eq(amcServiceReports.id, amcServiceReportEquipment.serviceReportId))
      .innerJoin(amcContracts, eq(amcContracts.id, amcServiceReports.amcContractId))
      .leftJoin(amcServiceVisits, eq(amcServiceVisits.id, amcServiceReports.amcServiceVisitId))
      .leftJoin(visitTechnicians, eq(visitTechnicians.id, amcServiceVisits.technicianEmployeeId))
      .leftJoin(reportTechnicians, eq(reportTechnicians.id, amcServiceReports.technicianEmployeeId))
      .leftJoin(amcContractEquipment, eq(amcContractEquipment.id, amcServiceReportEquipment.equipmentId))
      .where(
        or(
          eq(amcServiceReportEquipment.customerEquipmentId, equipmentId),
          eq(amcContractEquipment.customerEquipmentId, equipmentId)
        )
      )
      .orderBy(desc(amcServiceReports.inspectionDate));

    const serviceVisits = reports.map((r: any) => ({
      id: r.id,
      visitId: r.visitId,
      visitNumber: r.visitNumber,
      visitDate: (r.visitCompletedAt || r.inspectionDate)?.toISOString?.() || String(r.visitCompletedAt || r.inspectionDate),
      visitType: r.serviceType || 'PREVENTIVE',
      status: r.visitStatus || r.status,
      visitOutcome: r.visitOutcome,
      reportNumber: r.reportNumber,
      engineerName: r.technicianName,
      findings: r.observations || r.serviceSummary,
      conditionStatus: r.conditionStatus,
      contractNumber: r.contractNumber,
    }));

    return {
      serviceRequests: requests,
      inspections: reports,
      serviceVisits,
    };
  }

  async getAmcHistory(equipmentId: string, txClient: any = db) {
    const contracts = await txClient
      .select({
        contractId: amcContracts.id,
        contractNumber: amcContracts.contractNumber,
        amcPlan: amcContracts.amcPlan,
        status: amcContracts.status,
        paymentStatus: amcContracts.paymentStatus,
        contractStartDate: amcContracts.contractStartDate,
        contractEndDate: amcContracts.contractEndDate,
        serviceFrequency: amcContracts.serviceFrequency,
        scheduledVisits: amcContracts.scheduledVisits,
        completedVisits: amcContracts.completedVisits,
        unitPrice: amcContractEquipment.unitPrice,
        lineTotal: amcContractEquipment.lineTotal,
        conditionStatus: amcContractEquipment.conditionStatus,
      })
      .from(amcContractEquipment)
      .innerJoin(amcContracts, eq(amcContracts.id, amcContractEquipment.amcContractId))
      .where(eq(amcContractEquipment.customerEquipmentId, equipmentId))
      .orderBy(desc(amcContracts.contractStartDate));

    return contracts;
  }

  async update(id: string, data: UpdateCustomerEquipmentInput, txClient: any = db): Promise<CustomerEquipmentEntity> {
    const updatePayload: any = {
      updatedAt: new Date(),
    };

    if (data.destinationId !== undefined) updatePayload.destinationId = data.destinationId;
    if (data.installationLocation !== undefined) updatePayload.installationLocation = data.installationLocation;
    if (data.installationNotes !== undefined) updatePayload.installationNotes = data.installationNotes;
    if (data.installationDate !== undefined) {
      updatePayload.installationDate = data.installationDate ? new Date(data.installationDate) : null;
    }
    if (data.serialNumber !== undefined) updatePayload.serialNumber = data.serialNumber;
    if (data.conditionStatus !== undefined) updatePayload.conditionStatus = data.conditionStatus;
    if (data.assetStatus !== undefined) updatePayload.assetStatus = data.assetStatus;

    const [updated] = await txClient
      .update(customerEquipment)
      .set(updatePayload)
      .where(eq(customerEquipment.id, id))
      .returning();

    return updated;
  }

  async create(data: NewCustomerEquipmentEntity, txClient: any = db): Promise<CustomerEquipmentEntity> {
    const [created] = await txClient
      .insert(customerEquipment)
      .values(data)
      .returning();
    return created;
  }
}
