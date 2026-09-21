import { eq, and, desc, sql, like, or, lte, gte, gt } from 'drizzle-orm';
import { db } from '../../../database/db.js';
import {
  amcContracts,
  amcContractEquipment,
  amcContractScopeItems,
  amcContractExclusions,
  amcContractEscalations,
  amcServiceVisits,
  amcServiceRequests,
  amcServiceReports,
  amcServiceReportItems,
  amcServiceReportEquipment,
  amcServiceReportAttachments,
  amcServiceReportMaterials,
  AmcContractEntity,
} from '../../../database/schema/amc-contracts.js';
import { quotations, quotationRevisions, quotationItems, quotationAmcScopeItems, quotationAmcExclusions, quotationAmcEscalations } from '../../../database/schema/quotations.js';
import { customers, customerDestinations } from '../../../database/schema/customers.js';
import { tasks } from '../../../database/schema/tasks.js';
import { users } from '../../../database/schema/users.js';
import { products } from '../../../database/schema/products.js';
import { AmcContractNumberService } from './amc-contract-number.service.js';
import { AmcServiceReportPdfService, ServiceReportPdfData } from './amc-service-report-pdf.service.js';

export class AmcContractService {
  private numberService = new AmcContractNumberService();

  /**
   * Create an AMC Contract from an accepted AMC quotation snapshot
   */
  public async createContractFromQuotation(
    quotationId: string,
    createdById: string
  ): Promise<AmcContractEntity> {
    return await db.transaction(async (tx) => {
      // 1. Fetch quotation
      const [quotation] = await tx
        .select()
        .from(quotations)
        .where(eq(quotations.id, quotationId))
        .limit(1);

      if (!quotation) {
        throw new Error(`Quotation with ID ${quotationId} not found.`);
      }

      if (quotation.quotationType !== 'AMC') {
        throw new Error(`Only AMC type quotations can be converted into an AMC Contract.`);
      }

      // 2. Check existing contract
      const [existingContract] = await tx
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.quotationId, quotationId))
        .limit(1);

      if (existingContract) {
        return existingContract;
      }

      // 3. Fetch latest / current revision
      const [revision] = await tx
        .select()
        .from(quotationRevisions)
        .where(
          and(
            eq(quotationRevisions.quotationId, quotationId),
            eq(quotationRevisions.isCurrent, true)
          )
        )
        .limit(1);

      if (!revision) {
        throw new Error(`No current revision found for quotation ${quotation.quotationNumber}`);
      }

      // 4. Fetch revision items, scope, exclusions, escalations
      const items = await tx
        .select()
        .from(quotationItems)
        .where(eq(quotationItems.quotationRevisionId, revision.id));

      const scopeItems = await tx
        .select()
        .from(quotationAmcScopeItems)
        .where(eq(quotationAmcScopeItems.quotationRevisionId, revision.id))
        .orderBy(quotationAmcScopeItems.sortOrder);

      const exclusions = await tx
        .select()
        .from(quotationAmcExclusions)
        .where(eq(quotationAmcExclusions.quotationRevisionId, revision.id))
        .orderBy(quotationAmcExclusions.sortOrder);

      const escalations = await tx
        .select()
        .from(quotationAmcEscalations)
        .where(eq(quotationAmcEscalations.quotationRevisionId, revision.id))
        .orderBy(quotationAmcEscalations.sortOrder);

      // 5. Generate unique contract number
      const contractNumber = await this.numberService.generateNumber('AMC', new Date(), tx);

      // 6. Calculate dates & parameters
      const startDate = revision.amcStartDate ? new Date(revision.amcStartDate) : new Date();
      const endDate = revision.amcEndDate
        ? new Date(revision.amcEndDate)
        : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      // 7. Insert contract master
      const [contract] = await tx
        .insert(amcContracts)
        .values({
          contractNumber,
          quotationId: quotation.id,
          quotationRevisionId: revision.id,
          customerId: quotation.customerId,
          destinationId: quotation.destinationId,
          customerName: revision.customerName,
          companyName: revision.companyName,
          endUser: revision.endUser || revision.companyName || revision.customerName,
          customerCode: revision.customerCode,
          branch: revision.branch,
          zone: revision.zone,
          amcPlan: revision.amcPlan || 'Comprehensive AMC',
          contractStartDate: startDate,
          contractEndDate: endDate,
          serviceFrequency: revision.amcServiceFrequency || 'Quarterly',
          scheduledVisits: revision.amcScheduledVisits || 4,
          completedVisits: 0,
          breakdownVisitType: revision.amcBreakdownVisitType || 'UNLIMITED',
          status: 'PENDING_ACTIVATION',
          paymentStatus: 'PENDING',
          totalAmount: revision.grandTotal,
          specialClauses: revision.specialClauses,
          amcPaymentTerms: revision.amcPaymentTerms || revision.paymentTerms,
          createdById,
        })
        .returning();

      // 8. Copy equipment rows
      if (items.length > 0) {
        await tx.insert(amcContractEquipment).values(
          items.map((item) => ({
            amcContractId: contract.id,
            quotationItemId: item.id,
            equipmentType: item.equipmentType || 'STABILIZER',
            equipmentName: item.productName,
            configuration: item.equipmentConfiguration || item.model,
            rating: item.equipmentRating,
            make: item.make,
            model: item.model,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            status: 'ACTIVE',
          }))
        );
      }

      // 9. Copy scope items
      if (scopeItems.length > 0) {
        await tx.insert(amcContractScopeItems).values(
          scopeItems.map((s) => ({
            amcContractId: contract.id,
            description: s.description,
            sortOrder: s.sortOrder,
          }))
        );
      }

      // 10. Copy exclusions
      if (exclusions.length > 0) {
        await tx.insert(amcContractExclusions).values(
          exclusions.map((e) => ({
            amcContractId: contract.id,
            description: e.description,
            sortOrder: e.sortOrder,
          }))
        );
      }

      // 11. Copy escalations
      if (escalations.length > 0) {
        await tx.insert(amcContractEscalations).values(
          escalations.map((esc) => ({
            amcContractId: contract.id,
            level: esc.level,
            contactName: esc.contactName,
            phone: esc.phone,
            email: esc.email,
            sortOrder: esc.sortOrder,
          }))
        );
      }

      return contract;
    });
  }

  /**
   * Calendar-aware Service Schedule Generator
   */
  public async generateServiceSchedule(contractId: string): Promise<any[]> {
    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    // Clear any existing scheduled visits
    await db.delete(amcServiceVisits).where(eq(amcServiceVisits.amcContractId, contractId));

    const visitsCount = Math.max(1, contract.scheduledVisits || 4);
    const startDate = new Date(contract.contractStartDate);
    const endDate = new Date(contract.contractEndDate);
    const frequency = (contract.serviceFrequency || 'Quarterly').toUpperCase();

    const visitValues: any[] = [];

    for (let i = 0; i < visitsCount; i++) {
      let scheduledDate = new Date(startDate.getTime());

      if (frequency.includes('MONTHLY') && !frequency.includes('BI-MONTHLY') && !frequency.includes('HALF')) {
        scheduledDate.setMonth(startDate.getMonth() + i);
      } else if (frequency.includes('BI-MONTHLY')) {
        scheduledDate.setMonth(startDate.getMonth() + i * 2);
      } else if (frequency.includes('QUARTERLY')) {
        scheduledDate.setMonth(startDate.getMonth() + i * 3);
      } else if (frequency.includes('HALF-YEARLY') || frequency.includes('HALF YEARLY')) {
        scheduledDate.setMonth(startDate.getMonth() + i * 6);
      } else if (frequency.includes('YEARLY')) {
        scheduledDate.setFullYear(startDate.getFullYear() + i);
      } else {
        // Custom interval calculation
        const totalDurationMs = endDate.getTime() - startDate.getTime();
        const stepMs = totalDurationMs / Math.max(1, visitsCount);
        scheduledDate = new Date(startDate.getTime() + stepMs * i);
      }

      // Ensure scheduled date does not exceed contract end date
      if (scheduledDate > endDate) {
        scheduledDate = new Date(endDate.getTime());
      }

      visitValues.push({
        amcContractId: contract.id,
        visitNumber: i + 1,
        scheduledDate,
        serviceType: 'PREVENTIVE',
        status: 'SCHEDULED',
      });
    }

    if (visitValues.length > 0) {
      return await db.insert(amcServiceVisits).values(visitValues).returning();
    }

    return [];
  }

  /**
   * Activate an AMC contract and generate its preventive service schedule
   */
  public async activateContract(contractId: string, updatedById?: string): Promise<AmcContractEntity> {
    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    const [updated] = await db
      .update(amcContracts)
      .set({
        status: 'ACTIVE',
        updatedById: updatedById || null,
        updatedAt: new Date(),
      })
      .where(eq(amcContracts.id, contractId))
      .returning();

    // Automatically generate preventive visits
    await this.generateServiceSchedule(contractId);

    return updated;
  }

  /**
   * Terminate an AMC contract.
   * - Only ACTIVE or EXPIRING_SOON contracts may be terminated.
   * - Cancels all future SCHEDULED service visits (per AMC document termination rules).
   * - Records the formal notice date and the effective termination date.
   */
  public async terminateContract(
    contractId: string,
    data: {
      reason: string;
      terminationNoticeDate?: Date;
      terminationDate?: Date;
    },
    updatedById?: string
  ): Promise<AmcContractEntity> {
    return await db.transaction(async (tx) => {
      const [contract] = await tx
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.id, contractId))
        .limit(1);

      if (!contract) {
        throw new Error(`AMC Contract ${contractId} not found.`);
      }

      // Compute effective status (same logic as list/detail)
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let effectiveStatus = contract.status;
      if (effectiveStatus === 'ACTIVE') {
        const endDate = new Date(contract.contractEndDate);
        if (now > endDate) effectiveStatus = 'EXPIRED';
        else if (endDate <= thirtyDaysFromNow) effectiveStatus = 'EXPIRING_SOON';
      }

      const allowedStatuses = ['ACTIVE', 'EXPIRING_SOON'];
      if (!allowedStatuses.includes(effectiveStatus)) {
        throw new Error(
          `Cannot terminate contract in status "${effectiveStatus}". ` +
          `Only ACTIVE or EXPIRING_SOON contracts may be terminated.`
        );
      }

      if (!data.reason?.trim()) {
        throw new Error('Termination reason is required.');
      }

      const effectiveTerminationDate = data.terminationDate || now;

      // Cancel future SCHEDULED visits (visits not yet started/completed)
      await tx
        .update(amcServiceVisits)
        .set({
          status: 'CANCELLED',
          technicianNotes: `Cancelled due to contract termination on ${effectiveTerminationDate.toISOString().split('T')[0]}.`,
          updatedAt: now,
        })
        .where(
          and(
            eq(amcServiceVisits.amcContractId, contractId),
            eq(amcServiceVisits.status, 'SCHEDULED')
          )
        );

      const [updated] = await tx
        .update(amcContracts)
        .set({
          status: 'TERMINATED',
          terminationReason: data.reason.trim(),
          terminationNoticeDate: data.terminationNoticeDate || null,
          terminatedAt: effectiveTerminationDate,
          updatedById: updatedById || null,
          updatedAt: now,
        })
        .where(eq(amcContracts.id, contractId))
        .returning();

      return updated;
    });
  }


  /**
   * Renew an AMC Contract.
   * Creates a NEW contract for the next service period.
   * - Source contract must be ACTIVE, EXPIRING_SOON, or EXPIRED.
   * - TERMINATED contracts cannot be renewed.
   * - The previous contract is NOT modified.
   * - New contract starts in PENDING_ACTIVATION state (per AMC advance-payment rule).
   * - Service schedule is generated when the new contract is activated.
   */
  public async renewContract(
    sourceContractId: string,
    renewalData: {
      contractStartDate: Date;
      contractEndDate: Date;
      amcPlan?: string;
      serviceFrequency?: string;
      scheduledVisits?: number;
      breakdownVisitType?: string;
      specialClauses?: string;
      amcPaymentTerms?: string;
      endUser?: string;
      totalAmount?: string;
      // Equipment/scope/exclusion/escalation overrides: if not provided, source contract data is copied
      equipment?: Array<{
        equipmentType?: string;
        equipmentName: string;
        configuration?: string;
        rating?: string;
        make?: string;
        model?: string;
        quantity: number;
        unitPrice?: string;
        lineTotal?: string;
      }>;
      scopeItems?: Array<{ description: string; sortOrder?: number }>;
      exclusions?: Array<{ description: string; sortOrder?: number }>;
      escalations?: Array<{ level: number; contactName: string; phone?: string; email?: string; sortOrder?: number }>;
    },
    createdById: string
  ): Promise<AmcContractEntity> {
    return await db.transaction(async (tx) => {
      // 1. Fetch source contract
      const [source] = await tx
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.id, sourceContractId))
        .limit(1);

      if (!source) {
        throw new Error(`Source AMC Contract ${sourceContractId} not found.`);
      }

      // 2. Validate eligible statuses for renewal
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      let effectiveStatus = source.status;
      if (effectiveStatus === 'ACTIVE') {
        const endDate = new Date(source.contractEndDate);
        if (now > endDate) effectiveStatus = 'EXPIRED';
        else if (endDate <= thirtyDaysFromNow) effectiveStatus = 'EXPIRING_SOON';
      }

      const renewableStatuses = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED'];
      if (!renewableStatuses.includes(effectiveStatus)) {
        throw new Error(
          `Contract in status "${effectiveStatus}" cannot be renewed. ` +
          `Only ACTIVE, EXPIRING_SOON, or EXPIRED contracts are eligible for renewal.`
        );
      }

      // 3. Validate renewal dates
      if (!renewalData.contractStartDate || !renewalData.contractEndDate) {
        throw new Error('New contract start date and end date are required for renewal.');
      }
      if (renewalData.contractStartDate >= renewalData.contractEndDate) {
        throw new Error('Renewal start date must be before end date.');
      }

      // 4. Generate new contract number
      const newContractNumber = await this.numberService.generateNumber('AMC', now, tx);

      // 5. Fetch source child data (for snapshot copy)
      const sourceEquipment = await tx
        .select()
        .from(amcContractEquipment)
        .where(eq(amcContractEquipment.amcContractId, sourceContractId));

      const sourceScopeItems = await tx
        .select()
        .from(amcContractScopeItems)
        .where(eq(amcContractScopeItems.amcContractId, sourceContractId))
        .orderBy(amcContractScopeItems.sortOrder);

      const sourceExclusions = await tx
        .select()
        .from(amcContractExclusions)
        .where(eq(amcContractExclusions.amcContractId, sourceContractId))
        .orderBy(amcContractExclusions.sortOrder);

      const sourceEscalations = await tx
        .select()
        .from(amcContractEscalations)
        .where(eq(amcContractEscalations.amcContractId, sourceContractId))
        .orderBy(amcContractEscalations.level);

      // 6. Create the new (renewal) contract
      const [newContract] = await tx
        .insert(amcContracts)
        .values({
          contractNumber: newContractNumber,
          quotationId: source.quotationId,
          quotationRevisionId: source.quotationRevisionId,
          customerId: source.customerId,
          destinationId: source.destinationId,
          customerName: source.customerName,
          companyName: source.companyName,
          endUser: renewalData.endUser ?? source.endUser,
          customerCode: source.customerCode,
          branch: source.branch,
          zone: source.zone,
          amcPlan: renewalData.amcPlan ?? source.amcPlan,
          contractStartDate: renewalData.contractStartDate,
          contractEndDate: renewalData.contractEndDate,
          serviceFrequency: renewalData.serviceFrequency ?? source.serviceFrequency,
          scheduledVisits: renewalData.scheduledVisits ?? source.scheduledVisits,
          completedVisits: 0,
          breakdownVisitType: renewalData.breakdownVisitType ?? source.breakdownVisitType,
          status: 'PENDING_ACTIVATION',
          paymentStatus: 'PENDING',
          totalAmount: renewalData.totalAmount ?? source.totalAmount,
          specialClauses: renewalData.specialClauses ?? source.specialClauses,
          amcPaymentTerms: renewalData.amcPaymentTerms ?? source.amcPaymentTerms,
          renewedFromContractId: sourceContractId,
          createdById,
        })
        .returning();

      // 7. Copy / override equipment
      const equipmentOverrides = renewalData.equipment && renewalData.equipment.length > 0
        ? renewalData.equipment.map((e, idx) => ({
            amcContractId: newContract.id,
            equipmentType: e.equipmentType || 'STABILIZER',
            equipmentName: e.equipmentName,
            configuration: e.configuration,
            rating: e.rating,
            make: e.make,
            model: e.model,
            quantity: String(e.quantity),
            unitPrice: e.unitPrice,
            lineTotal: e.lineTotal,
            status: 'ACTIVE',
            sortOrder: idx + 1,
          }))
        : sourceEquipment.map((e) => ({
            amcContractId: newContract.id,
            equipmentType: e.equipmentType,
            equipmentName: e.equipmentName,
            configuration: e.configuration,
            rating: e.rating,
            make: e.make,
            model: e.model,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            lineTotal: e.lineTotal,
            status: 'ACTIVE',
          }));

      if (equipmentOverrides.length > 0) {
        await tx.insert(amcContractEquipment).values(equipmentOverrides as any);
      }

      // 8. Copy / override scope items
      const scopeToInsert = renewalData.scopeItems && renewalData.scopeItems.length > 0
        ? renewalData.scopeItems.map((s, idx) => ({
            amcContractId: newContract.id,
            description: s.description,
            sortOrder: s.sortOrder ?? idx + 1,
          }))
        : sourceScopeItems.map((s) => ({
            amcContractId: newContract.id,
            description: s.description,
            sortOrder: s.sortOrder,
          }));

      if (scopeToInsert.length > 0) {
        await tx.insert(amcContractScopeItems).values(scopeToInsert);
      }

      // 9. Copy / override exclusions
      const exclusionsToInsert = renewalData.exclusions && renewalData.exclusions.length > 0
        ? renewalData.exclusions.map((e, idx) => ({
            amcContractId: newContract.id,
            description: e.description,
            sortOrder: e.sortOrder ?? idx + 1,
          }))
        : sourceExclusions.map((e) => ({
            amcContractId: newContract.id,
            description: e.description,
            sortOrder: e.sortOrder,
          }));

      if (exclusionsToInsert.length > 0) {
        await tx.insert(amcContractExclusions).values(exclusionsToInsert);
      }

      // 10. Copy / override escalations
      const escalationsToInsert = renewalData.escalations && renewalData.escalations.length > 0
        ? renewalData.escalations.map((esc, idx) => ({
            amcContractId: newContract.id,
            level: String(esc.level),
            contactName: esc.contactName,
            phone: esc.phone,
            email: esc.email,
            sortOrder: esc.sortOrder ?? idx + 1,
          }))
        : sourceEscalations.map((esc) => ({
            amcContractId: newContract.id,
            level: esc.level,
            contactName: esc.contactName,
            phone: esc.phone,
            email: esc.email,
            sortOrder: esc.sortOrder,
          }));

      if (escalationsToInsert.length > 0) {
        await tx.insert(amcContractEscalations).values(escalationsToInsert as any);
      }

      return newContract;
    });
  }

  /**
   * Get the renewal history chain for a contract.
   * Returns all contracts in the chain (predecessors and successors).
   */
  public async getContractHistory(contractId: string): Promise<{
    ancestors: AmcContractEntity[];
    current: AmcContractEntity;
    successors: AmcContractEntity[];
  }> {
    const [current] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, contractId))
      .limit(1);

    if (!current) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    // Walk backwards through the renewal chain (ancestors)
    const ancestors: AmcContractEntity[] = [];
    let cursor = current;
    while (cursor.renewedFromContractId) {
      const [prev] = await db
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.id, cursor.renewedFromContractId))
        .limit(1);
      if (!prev) break;
      ancestors.unshift(prev);
      cursor = prev;
    }

    // Find all direct renewals of this contract (successors)
    const successors = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.renewedFromContractId, contractId))
      .orderBy(amcContracts.createdAt);

    return { ancestors, current, successors };
  }

  /**
   * List contracts with filters and pagination
   */
  public async getContracts(query: {

    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    customerId?: string;
    amcPlan?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.status) {
      conditions.push(eq(amcContracts.status, query.status));
    }

    if (query.customerId) {
      conditions.push(eq(amcContracts.customerId, query.customerId));
    }

    if (query.amcPlan) {
      conditions.push(eq(amcContracts.amcPlan, query.amcPlan));
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`;
      conditions.push(
        or(
          like(amcContracts.contractNumber, searchPattern),
          like(amcContracts.customerName, searchPattern),
          like(amcContracts.endUser, searchPattern)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const data = await db
      .select({
        contract: amcContracts,
        customerName: customers.companyName,
      })
      .from(amcContracts)
      .leftJoin(customers, eq(amcContracts.customerId, customers.id))
      .where(whereClause)
      .orderBy(desc(amcContracts.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalCountResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(amcContracts)
      .where(whereClause);

    const total = Number(totalCountResult?.count || 0);

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const formattedData = data.map((item) => {
      let computedStatus = item.contract.status;
      if (computedStatus === 'ACTIVE') {
        const endDate = new Date(item.contract.contractEndDate);
        if (now > endDate) {
          computedStatus = 'EXPIRED';
        } else if (endDate <= thirtyDaysFromNow) {
          computedStatus = 'EXPIRING_SOON';
        }
      }
      return {
        ...item.contract,
        status: computedStatus,
        customerCompanyName: item.customerName || item.contract.customerName,
      };
    });

    return {
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single contract detail with all snapshot child records & schedule
   */
  public async getContractById(contractId: string) {
    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    const equipment = await db
      .select()
      .from(amcContractEquipment)
      .where(eq(amcContractEquipment.amcContractId, contractId));

    const scopeItems = await db
      .select()
      .from(amcContractScopeItems)
      .where(eq(amcContractScopeItems.amcContractId, contractId))
      .orderBy(amcContractScopeItems.sortOrder);

    const exclusions = await db
      .select()
      .from(amcContractExclusions)
      .where(eq(amcContractExclusions.amcContractId, contractId))
      .orderBy(amcContractExclusions.sortOrder);

    const escalations = await db
      .select()
      .from(amcContractEscalations)
      .where(eq(amcContractEscalations.amcContractId, contractId))
      .orderBy(amcContractEscalations.level);

    const visits = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.amcContractId, contractId))
      .orderBy(amcServiceVisits.visitNumber);

    const requestsRaw = await db
      .select()
      .from(amcServiceRequests)
      .where(eq(amcServiceRequests.amcContractId, contractId))
      .orderBy(desc(amcServiceRequests.createdAt));

    const visitIds = requestsRaw.map((r) => r.amcServiceVisitId).filter((id): id is string => Boolean(id));
    const reportsForVisits = visitIds.length > 0
      ? await db
          .select({ id: amcServiceReports.id, visitId: amcServiceReports.amcServiceVisitId, status: amcServiceReports.status })
          .from(amcServiceReports)
          .where(sql`${amcServiceReports.amcServiceVisitId} IN ${visitIds}`)
      : [];
    const reportMap = new Map(reportsForVisits.map((rep) => [rep.visitId, rep]));

    const requests = requestsRaw.map((req) => {
      const eqItem = req.equipmentId ? equipment.find((e) => e.id === req.equipmentId) : null;
      const escItem = escalations.find((e) => e.level === req.escalationLevel);
      const visitItem = req.amcServiceVisitId ? visits.find((v) => v.id === req.amcServiceVisitId) : null;
      const repItem = req.amcServiceVisitId ? reportMap.get(req.amcServiceVisitId) : null;

      return {
        ...req,
        equipmentName: eqItem?.equipmentName || null,
        equipmentConfiguration: eqItem?.configuration || null,
        escalationContactName: escItem?.contactName || null,
        escalationPhone: escItem?.phone || null,
        escalationEmail: escItem?.email || null,
        visitStatus: visitItem?.status || null,
        serviceReportId: repItem?.id || null,
        serviceReportStatus: repItem?.status || null,
      };
    });

    const [quotation] = await db
      .select()
      .from(quotations)
      .where(eq(quotations.id, contract.quotationId))
      .limit(1);

    let computedStatus = contract.status;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (computedStatus === 'ACTIVE') {
      const endDate = new Date(contract.contractEndDate);
      if (now > endDate) {
        computedStatus = 'EXPIRED';
      } else if (endDate <= thirtyDaysFromNow) {
        computedStatus = 'EXPIRING_SOON';
      }
    }

    return {
      ...contract,
      status: computedStatus,
      equipment,
      scopeItems,
      exclusions,
      escalations,
      serviceVisits: visits,
      serviceRequests: requests,
      sourceQuotationNumber: quotation?.quotationNumber,
    };
  }

  /**
   * Log a Breakdown Service Request against an active or expiring AMC contract
   */
  public async createBreakdownRequest(
    contractId: string,
    data: {
      equipmentId?: string;
      issueDescription: string;
      priority?: string;
      escalationLevel?: string;
      requestedAt?: string;
      notes?: string;
    },
    userId: string
  ) {
    const contract = await this.getContractById(contractId);
    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    if (['EXPIRED', 'TERMINATED', 'CANCELLED', 'DRAFT', 'PENDING_ACTIVATION'].includes(contract.status)) {
      throw new Error(`Cannot create breakdown request for contract with status '${contract.status}'. Only ACTIVE or EXPIRING_SOON contracts are eligible.`);
    }

    if (data.equipmentId) {
      const eqItem = contract.equipment?.find((e) => e.id === data.equipmentId);
      if (!eqItem) {
        throw new Error(`Equipment ID ${data.equipmentId} does not belong to AMC contract ${contractId}.`);
      }
    }

    const escalationLevel = data.escalationLevel || 'LEVEL_1';
    if (!['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(escalationLevel)) {
      throw new Error(`Invalid escalation level '${escalationLevel}'. Must be LEVEL_1, LEVEL_2, or LEVEL_3.`);
    }

    const requestedAt = data.requestedAt ? new Date(data.requestedAt) : new Date();
    const requestNumber = await this.numberService.generateNumber('SR', requestedAt);

    // Resolve or create valid destination for Task module
    let taskId: string | null = null;
    if (contract.customerId) {
      let destId = contract.destinationId;
      if (!destId) {
        const [existingDest] = await db
          .select()
          .from(customerDestinations)
          .where(eq(customerDestinations.customerId, contract.customerId))
          .limit(1);

        if (existingDest) {
          destId = existingDest.id;
        } else {
          const [newDest] = await db
            .insert(customerDestinations)
            .values({
              customerId: contract.customerId,
              name: contract.branch || contract.customerName || 'Main Site',
              address: contract.customerName,
            })
            .returning();
          destId = newDest.id;
        }
      }

      const [task] = await db
        .insert(tasks)
        .values({
          customerId: contract.customerId,
          destinationId: destId,
          title: `[Breakdown SR] ${contract.contractNumber} - ${data.issueDescription.slice(0, 50)}`,
          description: `AMC Breakdown Request ${requestNumber} for ${contract.customerName} (${contract.contractNumber})\n\nIssue Details:\n${data.issueDescription}`,
          priority: data.priority || 'HIGH',
          status: 'CREATED',
          createdBy: userId,
        })
        .returning();

      taskId = task.id;
    }

    // Create Breakdown Service Visit (serviceType = BREAKDOWN)
    const [visit] = await db
      .insert(amcServiceVisits)
      .values({
        amcContractId: contractId,
        visitNumber: (contract.serviceVisits?.length || 0) + 1,
        scheduledDate: requestedAt,
        serviceType: 'BREAKDOWN',
        status: taskId ? 'ASSIGNED' : 'SCHEDULED',
        taskId,
      })
      .returning();

    // Create Breakdown Service Request
    const [request] = await db
      .insert(amcServiceRequests)
      .values({
        amcContractId: contractId,
        requestNumber,
        serviceType: 'BREAKDOWN',
        equipmentId: data.equipmentId || null,
        issueDescription: data.issueDescription,
        priority: data.priority || 'HIGH',
        escalationLevel,
        requestedAt,
        status: taskId ? 'ASSIGNED' : 'OPEN',
        taskId,
        amcServiceVisitId: visit.id,
        notes: data.notes || null,
        createdById: userId,
      })
      .returning();

    return request;
  }

  /**
   * Escalate Breakdown Service Request to a higher escalation level (LEVEL_1 -> LEVEL_2 -> LEVEL_3)
   */
  public async escalateBreakdownRequest(
    contractId: string,
    requestId: string,
    data: { newLevel: string; notes?: string },
    userId: string
  ) {
    const contract = await this.getContractById(contractId);
    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    const [request] = await db
      .select()
      .from(amcServiceRequests)
      .where(and(eq(amcServiceRequests.id, requestId), eq(amcServiceRequests.amcContractId, contractId)))
      .limit(1);

    if (!request) {
      throw new Error(`Breakdown request ${requestId} not found on contract ${contractId}.`);
    }

    if (['RESOLVED', 'CANCELLED'].includes(request.status)) {
      throw new Error(`Cannot escalate a request that is already ${request.status}.`);
    }

    if (!['LEVEL_1', 'LEVEL_2', 'LEVEL_3'].includes(data.newLevel)) {
      throw new Error(`Invalid escalation level '${data.newLevel}'. Must be LEVEL_1, LEVEL_2, or LEVEL_3.`);
    }

    const now = new Date();
    const updatedNotes = data.notes
      ? (request.notes ? `${request.notes}\n[Escalated to ${data.newLevel}]: ${data.notes}` : `[Escalated to ${data.newLevel}]: ${data.notes}`)
      : request.notes;

    const [updatedRequest] = await db
      .update(amcServiceRequests)
      .set({
        escalationLevel: data.newLevel,
        escalatedAt: now,
        notes: updatedNotes,
        updatedAt: now,
      })
      .where(eq(amcServiceRequests.id, requestId))
      .returning();

    const targetEscalation = contract.escalations?.find((e) => e.level === data.newLevel);

    return {
      ...updatedRequest,
      escalationContactName: targetEscalation?.contactName || null,
      escalationPhone: targetEscalation?.phone || null,
      escalationEmail: targetEscalation?.email || null,
    };
  }

  /**
   * Fetch single breakdown service request details
   */
  public async getBreakdownRequestById(contractId: string, requestId: string) {
    const contract = await this.getContractById(contractId);
    if (!contract) {
      throw new Error(`AMC Contract ${contractId} not found.`);
    }

    const [request] = await db
      .select()
      .from(amcServiceRequests)
      .where(and(eq(amcServiceRequests.id, requestId), eq(amcServiceRequests.amcContractId, contractId)))
      .limit(1);

    if (!request) {
      throw new Error(`Breakdown request ${requestId} not found.`);
    }

    const eqItem = request.equipmentId ? contract.equipment?.find((e) => e.id === request.equipmentId) : null;
    const escItem = contract.escalations?.find((e) => e.level === request.escalationLevel);

    let visit = null;
    let report = null;
    if (request.amcServiceVisitId) {
      [visit] = await db
        .select()
        .from(amcServiceVisits)
        .where(eq(amcServiceVisits.id, request.amcServiceVisitId))
        .limit(1);

      if (visit) {
        [report] = await db
          .select()
          .from(amcServiceReports)
          .where(eq(amcServiceReports.amcServiceVisitId, visit.id))
          .limit(1);
      }
    }

    return {
      ...request,
      contractNumber: contract.contractNumber,
      customerName: contract.customerName,
      equipmentName: eqItem?.equipmentName || null,
      equipmentConfiguration: eqItem?.configuration || null,
      escalationContactName: escItem?.contactName || null,
      escalationPhone: escItem?.phone || null,
      escalationEmail: escItem?.email || null,
      visitStatus: visit?.status || null,
      serviceReportId: report?.id || null,
      serviceReportStatus: report?.status || null,
    };
  }

  /**
   * Assign/Create field task for a scheduled service visit
   */
  public async createTaskForVisit(
    visitId: string,
    assignedEmployeeId?: string,
    userId?: string
  ) {
    const [visit] = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.id, visitId))
      .limit(1);

    if (!visit) {
      throw new Error(`Service visit ${visitId} not found.`);
    }

    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, visit.amcContractId))
      .limit(1);

    let taskId = visit.taskId;

    if (!taskId && contract.customerId) {
      let destId = contract.destinationId;
      if (!destId) {
        const [existingDest] = await db
          .select()
          .from(customerDestinations)
          .where(eq(customerDestinations.customerId, contract.customerId))
          .limit(1);

        if (existingDest) {
          destId = existingDest.id;
        } else {
          const [newDest] = await db
            .insert(customerDestinations)
            .values({
              customerId: contract.customerId,
              name: contract.branch || contract.customerName || 'Main Site',
              address: contract.customerName,
            })
            .returning();
          destId = newDest.id;
        }
      }

      const [newTask] = await db
        .insert(tasks)
        .values({
          customerId: contract.customerId,
          destinationId: destId,
          assignedTo: assignedEmployeeId || null,
          title: `[AMC Visit #${visit.visitNumber}] ${contract.contractNumber} - ${contract.customerName}`,
          description: `Preventive Maintenance Service Visit #${visit.visitNumber} for AMC Contract ${contract.contractNumber}.\nPlan: ${contract.amcPlan}\nFrequency: ${contract.serviceFrequency}`,
          scheduledAt: visit.scheduledDate,
          priority: 'MEDIUM',
          status: assignedEmployeeId ? 'ASSIGNED' : 'CREATED',
          createdBy: userId || contract.createdById,
        })
        .returning();

      taskId = newTask.id;
    }

    const [updatedVisit] = await db
      .update(amcServiceVisits)
      .set({
        taskId,
        assignedEmployeeId: assignedEmployeeId || visit.assignedEmployeeId,
        status: assignedEmployeeId ? 'ASSIGNED' : visit.status,
        updatedAt: new Date(),
      })
      .where(eq(amcServiceVisits.id, visitId))
      .returning();

    return updatedVisit;
  }

  /**
   * Start AMC Service Visit (SCHEDULED / ASSIGNED -> IN_PROGRESS)
   */
  public async startVisit(visitId: string, userId: string) {
    const [visit] = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.id, visitId))
      .limit(1);

    if (!visit) {
      throw new Error(`Service Visit ${visitId} not found.`);
    }

    if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
      throw new Error(`Cannot start a visit that is already ${visit.status}.`);
    }

    const now = new Date();
    const [updatedVisit] = await db
      .update(amcServiceVisits)
      .set({
        status: 'IN_PROGRESS',
        actualStartAt: visit.actualStartAt || now,
        technicianEmployeeId: userId,
        updatedAt: now,
      })
      .where(eq(amcServiceVisits.id, visitId))
      .returning();

    // Synchronize linked field task status if present
    if (visit.taskId) {
      await db
        .update(tasks)
        .set({
          status: 'IN_PROGRESS',
          startedAt: now,
          updatedAt: now,
        })
        .where(eq(tasks.id, visit.taskId));
    }

    return updatedVisit;
  }

  /**
   * Cancel AMC Service Visit
   */
  public async cancelVisit(visitId: string, reason: string, userId: string) {
    const [visit] = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.id, visitId))
      .limit(1);

    if (!visit) {
      throw new Error(`Service Visit ${visitId} not found.`);
    }

    if (visit.status === 'COMPLETED') {
      throw new Error('Cannot cancel a completed service visit.');
    }

    const now = new Date();
    const [updatedVisit] = await db
      .update(amcServiceVisits)
      .set({
        status: 'CANCELLED',
        cancellationReason: reason,
        cancelledAt: now,
        updatedAt: now,
      })
      .where(eq(amcServiceVisits.id, visitId))
      .returning();

    if (visit.taskId) {
      await db
        .update(tasks)
        .set({
          status: 'CANCELLED',
          cancellationReason: reason,
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(tasks.id, visit.taskId));
    }

    return updatedVisit;
  }

  /**
   * Get existing Service Report or initialize a DRAFT report pre-populated with contract scope items & equipment
   */
  public async getOrCreateServiceReport(visitId: string, userId: string) {
    const [existingReport] = await db
      .select()
      .from(amcServiceReports)
      .where(eq(amcServiceReports.amcServiceVisitId, visitId))
      .limit(1);

    if (existingReport) {
      const items = await db
        .select()
        .from(amcServiceReportItems)
        .where(eq(amcServiceReportItems.serviceReportId, existingReport.id))
        .orderBy(amcServiceReportItems.sortOrder);

      const equipment = await db
        .select()
        .from(amcServiceReportEquipment)
        .where(eq(amcServiceReportEquipment.serviceReportId, existingReport.id));

      const attachments = await db
        .select()
        .from(amcServiceReportAttachments)
        .where(eq(amcServiceReportAttachments.serviceReportId, existingReport.id));

      const materials = await db
        .select()
        .from(amcServiceReportMaterials)
        .where(eq(amcServiceReportMaterials.serviceReportId, existingReport.id))
        .orderBy(amcServiceReportMaterials.sortOrder);

      return {
        ...existingReport,
        items,
        equipment,
        attachments,
        materials,
      };
    }

    // Initialize DRAFT report pre-populated from contract snapshot
    return await db.transaction(async (tx) => {
      const [visit] = await tx
        .select()
        .from(amcServiceVisits)
        .where(eq(amcServiceVisits.id, visitId))
        .limit(1);

      if (!visit) {
        throw new Error(`Service visit ${visitId} not found.`);
      }

      const [contract] = await tx
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.id, visit.amcContractId))
        .limit(1);

      if (!contract) {
        throw new Error(`AMC Contract ${visit.amcContractId} not found.`);
      }

      const reportNumber = await this.numberService.generateNumber('SRPT', new Date(), tx);

      const scopeSnapshot = await tx
        .select()
        .from(amcContractScopeItems)
        .where(eq(amcContractScopeItems.amcContractId, contract.id))
        .orderBy(amcContractScopeItems.sortOrder);

      const equipmentSnapshot = await tx
        .select()
        .from(amcContractEquipment)
        .where(eq(amcContractEquipment.amcContractId, contract.id));

      const [report] = await tx
        .insert(amcServiceReports)
        .values({
          amcContractId: contract.id,
          amcServiceVisitId: visit.id,
          reportNumber,
          serviceType: visit.serviceType,
          status: 'DRAFT',
          inspectionDate: new Date(),
          technicianEmployeeId: userId,
          customerName: contract.customerName,
          createdById: userId,
        })
        .returning();

      // Populate checklist items from scope snapshot
      if (scopeSnapshot.length > 0) {
        await tx.insert(amcServiceReportItems).values(
          scopeSnapshot.map((s, idx) => ({
            serviceReportId: report.id,
            scopeItemId: s.id,
            scopeDescription: s.description,
            status: 'COMPLETED',
            remarks: 'Checked and found satisfactory',
            sortOrder: s.sortOrder || idx + 1,
          }))
        );
      }

      // Populate equipment inspection rows
      if (equipmentSnapshot.length > 0) {
        await tx.insert(amcServiceReportEquipment).values(
          equipmentSnapshot.map((eqItem) => ({
            serviceReportId: report.id,
            equipmentId: eqItem.id,
            equipmentName: eqItem.equipmentName,
            configuration: eqItem.configuration,
            rating: eqItem.rating,
            conditionStatus: 'OPERATIONAL',
            observations: 'Normal operating condition',
          }))
        );
      }

      const items = await tx
        .select()
        .from(amcServiceReportItems)
        .where(eq(amcServiceReportItems.serviceReportId, report.id))
        .orderBy(amcServiceReportItems.sortOrder);

      const equipment = await tx
        .select()
        .from(amcServiceReportEquipment)
        .where(eq(amcServiceReportEquipment.serviceReportId, report.id));

      return {
        ...report,
        items,
        equipment,
        materials: [],
        attachments: [],
      };
    });
  }

  /**
   * Update DRAFT Service Report
   */
  public async updateServiceReport(reportId: string, data: any, userId: string) {
    const [report] = await db
      .select()
      .from(amcServiceReports)
      .where(eq(amcServiceReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error(`Service Report ${reportId} not found.`);
    }

    if (report.status === 'COMPLETED') {
      throw new Error('Completed service reports are read-only and cannot be modified.');
    }

    return await db.transaction(async (tx) => {
      const [updatedReport] = await tx
        .update(amcServiceReports)
        .set({
          serviceSummary: data.serviceSummary !== undefined ? data.serviceSummary : report.serviceSummary,
          observations: data.observations !== undefined ? data.observations : report.observations,
          recommendations: data.recommendations !== undefined ? data.recommendations : report.recommendations,
          customerName: data.customerName || report.customerName,
          customerRemarks: data.customerRemarks !== undefined ? data.customerRemarks : report.customerRemarks,
          acknowledgementStatus: data.acknowledgementStatus || report.acknowledgementStatus,
          customerSignatureRef: data.customerSignatureRef || report.customerSignatureRef,
          updatedById: userId,
          updatedAt: new Date(),
        })
        .where(eq(amcServiceReports.id, reportId))
        .returning();

      // Update item checklist statuses if provided
      if (data.items && Array.isArray(data.items)) {
        for (const itemData of data.items) {
          if (itemData.id) {
            await tx
              .update(amcServiceReportItems)
              .set({
                status: itemData.status || 'COMPLETED',
                remarks: itemData.remarks !== undefined ? itemData.remarks : null,
              })
              .where(eq(amcServiceReportItems.id, itemData.id));
          }
        }
      }

      // Update equipment condition statuses if provided
      if (data.equipment && Array.isArray(data.equipment)) {
        for (const eqData of data.equipment) {
          if (eqData.id) {
            await tx
              .update(amcServiceReportEquipment)
              .set({
                conditionStatus: eqData.conditionStatus || 'OPERATIONAL',
                observations: eqData.observations !== undefined ? eqData.observations : null,
              })
              .where(eq(amcServiceReportEquipment.id, eqData.id));
          }
        }
      }

      // Handle materials CRUD (DRAFT only - immutability enforced above)
      if (data.materials && Array.isArray(data.materials)) {
        // Step 1: Delete materials that are no longer in the list (by id)
        if (data.deleteMaterialIds && Array.isArray(data.deleteMaterialIds)) {
          for (const mid of data.deleteMaterialIds) {
            await tx
              .delete(amcServiceReportMaterials)
              .where(
                and(
                  eq(amcServiceReportMaterials.id, mid),
                  eq(amcServiceReportMaterials.serviceReportId, reportId)
                )
              );
          }
        }

        // Step 2: Insert new / update existing materials
        for (const matData of data.materials) {
          if (matData.id) {
            // Update existing material
            await tx
              .update(amcServiceReportMaterials)
              .set({
                quantity: matData.quantity !== undefined ? String(matData.quantity) : undefined,
                materialType: matData.materialType || undefined,
                coverageType: matData.coverageType || undefined,
                remarks: matData.remarks !== undefined ? matData.remarks : null,
                unitSnapshot: matData.unitSnapshot || undefined,
                updatedById: userId,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(amcServiceReportMaterials.id, matData.id),
                  eq(amcServiceReportMaterials.serviceReportId, reportId)
                )
              );
          } else if (matData.productNameSnapshot && matData.quantity) {
            // Insert new material
            await tx.insert(amcServiceReportMaterials).values({
              serviceReportId: reportId,
              productId: matData.productId || null,
              productNameSnapshot: matData.productNameSnapshot,
              skuSnapshot: matData.skuSnapshot || null,
              unitSnapshot: matData.unitSnapshot || 'PCS',
              quantity: String(matData.quantity),
              materialType: matData.materialType || 'SPARE_PART',
              coverageType: matData.coverageType || 'AMC_INCLUDED',
              remarks: matData.remarks || null,
              sortOrder: matData.sortOrder || 0,
              createdById: userId,
            });
          }
        }
      }

      const items = await tx
        .select()
        .from(amcServiceReportItems)
        .where(eq(amcServiceReportItems.serviceReportId, reportId))
        .orderBy(amcServiceReportItems.sortOrder);

      const equipment = await tx
        .select()
        .from(amcServiceReportEquipment)
        .where(eq(amcServiceReportEquipment.serviceReportId, reportId));

      const materials = await tx
        .select()
        .from(amcServiceReportMaterials)
        .where(eq(amcServiceReportMaterials.serviceReportId, reportId))
        .orderBy(amcServiceReportMaterials.sortOrder);

      return {
        ...updatedReport,
        items,
        equipment,
        materials,
      };
    });
  }


  /**
   * Atomically Complete Service Visit and Service Report inside a single DB Transaction
   */
  public async completeServiceVisitAndReport(
    visitId: string,
    reportData: any,
    userId: string
  ) {
    return await db.transaction(async (tx) => {
      // 1. Fetch Visit & Contract
      const [visit] = await tx
        .select()
        .from(amcServiceVisits)
        .where(eq(amcServiceVisits.id, visitId))
        .limit(1);

      if (!visit) {
        throw new Error(`Service visit ${visitId} not found.`);
      }

      if (visit.status === 'COMPLETED') {
        throw new Error('This service visit is already marked COMPLETED.');
      }

      const [contract] = await tx
        .select()
        .from(amcContracts)
        .where(eq(amcContracts.id, visit.amcContractId))
        .limit(1);

      if (!contract) {
        throw new Error(`AMC Contract ${visit.amcContractId} not found.`);
      }

      // 2. Fetch or create report
      let [report] = await tx
        .select()
        .from(amcServiceReports)
        .where(eq(amcServiceReports.amcServiceVisitId, visitId))
        .limit(1);

      const now = new Date();

      if (!report) {
        const reportNumber = await this.numberService.generateNumber('SRPT', now, tx);
        [report] = await tx
          .insert(amcServiceReports)
          .values({
            amcContractId: contract.id,
            amcServiceVisitId: visit.id,
            reportNumber,
            serviceType: visit.serviceType,
            status: 'COMPLETED',
            inspectionDate: now,
            technicianEmployeeId: userId,
            serviceSummary: reportData?.serviceSummary || 'Preventive maintenance completed satisfactorily.',
            observations: reportData?.observations || 'All stabilizer voltage & electrical parameters verified.',
            recommendations: reportData?.recommendations || 'Regular servicing recommended.',
            customerName: reportData?.customerName || contract.customerName,
            customerRemarks: reportData?.customerRemarks || 'Satisfactory work.',
            acknowledgementStatus: 'ACKNOWLEDGED',
            acknowledgedAt: now,
            createdById: userId,
          })
          .returning();
      } else {
        [report] = await tx
          .update(amcServiceReports)
          .set({
            status: 'COMPLETED',
            serviceSummary: reportData?.serviceSummary !== undefined ? reportData.serviceSummary : report.serviceSummary,
            observations: reportData?.observations !== undefined ? reportData.observations : report.observations,
            recommendations: reportData?.recommendations !== undefined ? reportData.recommendations : report.recommendations,
            customerName: reportData?.customerName || report.customerName,
            customerRemarks: reportData?.customerRemarks !== undefined ? reportData.customerRemarks : report.customerRemarks,
            acknowledgementStatus: 'ACKNOWLEDGED',
            acknowledgedAt: now,
            updatedById: userId,
            updatedAt: now,
          })
          .where(eq(amcServiceReports.id, report.id))
          .returning();
      }

      // Update items checklist if provided
      if (reportData?.items && Array.isArray(reportData.items)) {
        for (const itemData of reportData.items) {
          if (itemData.id) {
            await tx
              .update(amcServiceReportItems)
              .set({
                status: itemData.status || 'COMPLETED',
                remarks: itemData.remarks !== undefined ? itemData.remarks : null,
              })
              .where(eq(amcServiceReportItems.id, itemData.id));
          }
        }
      }

      // Update equipment status if provided
      if (reportData?.equipment && Array.isArray(reportData.equipment)) {
        for (const eqData of reportData.equipment) {
          if (eqData.id) {
            await tx
              .update(amcServiceReportEquipment)
              .set({
                conditionStatus: eqData.conditionStatus || 'OPERATIONAL',
                observations: eqData.observations !== undefined ? eqData.observations : null,
              })
              .where(eq(amcServiceReportEquipment.id, eqData.id));
          }
        }
      }

      // 3. Complete Service Visit
      const [completedVisit] = await tx
        .update(amcServiceVisits)
        .set({
          status: 'COMPLETED',
          actualEndAt: visit.actualEndAt || now,
          completedAt: now,
          completedBy: userId,
          technicianEmployeeId: userId,
          technicianNotes: reportData?.serviceSummary || visit.technicianNotes,
          customerRemarks: reportData?.customerRemarks || visit.customerRemarks,
          visitOutcome: reportData?.visitOutcome || 'SATISFACTORY',
          updatedAt: now,
        })
        .where(eq(amcServiceVisits.id, visitId))
        .returning();

      // 4. Increment completed visits on AMC contract
      await tx
        .update(amcContracts)
        .set({
          completedVisits: sql`${amcContracts.completedVisits} + 1`,
          updatedAt: now,
        })
        .where(eq(amcContracts.id, contract.id));

      // 5. Synchronize linked task in tasks table
      if (visit.taskId) {
        await tx
          .update(tasks)
          .set({
            status: 'COMPLETED',
            completedAt: now,
            updatedAt: now,
          })
          .where(eq(tasks.id, visit.taskId));
      }

      // 5b. Resolve linked breakdown service request if this was a breakdown visit
      if (visit.serviceType === 'BREAKDOWN') {
        const reqConditions = [eq(amcServiceRequests.amcServiceVisitId, visit.id)];
        if (visit.taskId) {
          reqConditions.push(eq(amcServiceRequests.taskId, visit.taskId));
        }

        await tx
          .update(amcServiceRequests)
          .set({
            status: 'RESOLVED',
            resolvedAt: now,
            updatedAt: now,
          })
          .where(or(...reqConditions));
      }

      // 6. Consume inventory stock for company-supplied materials (idempotency-safe)
      // Fetch all materials for this report that need stock deduction
      const reportMaterials = await tx
        .select()
        .from(amcServiceReportMaterials)
        .where(eq(amcServiceReportMaterials.serviceReportId, report.id));

      for (const mat of reportMaterials) {
        // Skip CUSTOMER_SUPPLIED — customer provides the material, no company stock deduction
        if (mat.coverageType === 'CUSTOMER_SUPPLIED') continue;

        // Skip if already consumed (idempotency guard)
        if (mat.stockConsumedAt !== null) continue;

        // Skip if no product linked (manual free-text material, no stock tracking)
        if (!mat.productId) continue;

        const qty = Number(mat.quantity);
        if (qty <= 0) continue;

        // Validate sufficient stock
        const [product] = await tx
          .select({ id: products.id, stockQuantity: products.stockQuantity, name: products.name })
          .from(products)
          .where(eq(products.id, mat.productId))
          .limit(1);

        if (!product) {
          throw new Error(`Product ${mat.productId} not found during stock deduction for material "${mat.productNameSnapshot}".`);
        }

        if (product.stockQuantity < qty) {
          throw new Error(
            `Insufficient stock for "${product.name}" (${mat.skuSnapshot || mat.productId}). ` +
            `Required: ${qty} ${mat.unitSnapshot}, Available: ${product.stockQuantity} ${mat.unitSnapshot}.`
          );
        }

        // Atomically deduct stock
        await tx
          .update(products)
          .set({
            stockQuantity: sql`${products.stockQuantity} - ${qty}`,
            updatedAt: now,
          })
          .where(and(eq(products.id, mat.productId), gt(products.stockQuantity, qty - 1)));

        // Mark as consumed (idempotency seal)
        await tx
          .update(amcServiceReportMaterials)
          .set({ stockConsumedAt: now, updatedAt: now })
          .where(eq(amcServiceReportMaterials.id, mat.id));
      }

      return {
        visit: completedVisit,
        report,
      };
    });
  }


  /**
   * Generate official AMC Service Report PDF Buffer
   */
  public async generateServiceReportPdf(reportId: string): Promise<Buffer> {
    const [report] = await db
      .select()
      .from(amcServiceReports)
      .where(eq(amcServiceReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error(`Service Report ${reportId} not found.`);
    }

    const [visit] = await db
      .select()
      .from(amcServiceVisits)
      .where(eq(amcServiceVisits.id, report.amcServiceVisitId))
      .limit(1);

    const [contract] = await db
      .select()
      .from(amcContracts)
      .where(eq(amcContracts.id, report.amcContractId))
      .limit(1);

    let technicianName = 'Taneja Service Engineer';
    if (report.technicianEmployeeId) {
      const [tech] = await db
        .select()
        .from(users)
        .where(eq(users.id, report.technicianEmployeeId))
        .limit(1);
      if (tech) {
        technicianName = tech.fullName;
      }
    }

    const equipment = await db
      .select()
      .from(amcServiceReportEquipment)
      .where(eq(amcServiceReportEquipment.serviceReportId, report.id));

    const checklist = await db
      .select()
      .from(amcServiceReportItems)
      .where(eq(amcServiceReportItems.serviceReportId, report.id))
      .orderBy(amcServiceReportItems.sortOrder);

    const materials = await db
      .select()
      .from(amcServiceReportMaterials)
      .where(eq(amcServiceReportMaterials.serviceReportId, report.id))
      .orderBy(amcServiceReportMaterials.sortOrder);


    const pdfData: ServiceReportPdfData = {
      reportNumber: report.reportNumber,
      serviceType: report.serviceType,
      status: report.status,
      inspectionDate: report.inspectionDate.toISOString(),
      contractNumber: contract.contractNumber,
      visitNumber: visit.visitNumber,
      customerName: contract.customerName,
      companyName: contract.companyName || contract.customerName,
      endUser: contract.endUser || undefined,
      branch: contract.branch || undefined,
      zone: contract.zone || undefined,
      amcPlan: contract.amcPlan,
      technicianName,
      serviceSummary: report.serviceSummary || undefined,
      observations: report.observations || undefined,
      recommendations: report.recommendations || undefined,
      customerRemarks: report.customerRemarks || undefined,
      acknowledgementStatus: report.acknowledgementStatus,
      acknowledgedAt: report.acknowledgedAt?.toISOString(),
      equipment: equipment.map((e) => ({
        equipmentName: e.equipmentName,
        configuration: e.configuration || undefined,
        rating: e.rating || undefined,
        conditionStatus: e.conditionStatus,
        observations: e.observations || undefined,
      })),
      checklist: checklist.map((c) => ({
        scopeDescription: c.scopeDescription,
        status: c.status,
        remarks: c.remarks || undefined,
      })),
      materials: materials.map((m) => ({
        productNameSnapshot: m.productNameSnapshot,
        skuSnapshot: m.skuSnapshot || undefined,
        quantity: m.quantity,
        unitSnapshot: m.unitSnapshot,
        materialType: m.materialType,
        coverageType: m.coverageType,
        remarks: m.remarks || undefined,
      })),
    };

    return await AmcServiceReportPdfService.generatePdf(pdfData);
  }

  /**
   * Get all materials for a service report (used in API responses)
   */
  public async getMaterialsForReport(reportId: string) {
    const [report] = await db
      .select()
      .from(amcServiceReports)
      .where(eq(amcServiceReports.id, reportId))
      .limit(1);

    if (!report) {
      throw new Error(`Service Report ${reportId} not found.`);
    }

    return await db
      .select()
      .from(amcServiceReportMaterials)
      .where(eq(amcServiceReportMaterials.serviceReportId, reportId))
      .orderBy(amcServiceReportMaterials.sortOrder);
  }
}
