import { FollowUpRepository, FollowUpFilterOptions, FollowUpWithRelations } from '../repositories/follow-up.repository.js';
import { CustomerRepository } from '../../customers/repositories/customer.repository.js';
import { LeadRepository } from '../../leads/repositories/lead.repository.js';
import { QuotationRepository } from '../../quotations/repositories/quotation.repository.js';
import { EmployeeRepository } from '../../employees/repositories/employee.repository.js';
import { AmcContractService } from '../../amc-contracts/services/amc-contract.service.js';
import {
  CreateFollowUpInput,
  UpdateFollowUpInput,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
  CancelFollowUpInput,
} from '../validators/follow-up.validator.js';
import { FOLLOW_UP_STATUS, FOLLOW_UP_PRIORITY, FOLLOW_UP_TYPE } from '../constants/follow-up.constants.js';
import { AppError } from '../../../common/errors/AppError.js';
import { JwtPayload } from '../../../common/auth/jwt.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { db } from '../../../database/db.js';
import { amcContracts } from '../../../database/schema/amc-contracts.js';
import { quotations } from '../../../database/schema/quotations.js';
import { leads } from '../../../database/schema/leads.js';
import { eq } from 'drizzle-orm';

export class FollowUpService {
  constructor(
    private readonly followUpRepo: FollowUpRepository = new FollowUpRepository(),
    private readonly customerRepo: CustomerRepository = new CustomerRepository(),
    private readonly leadRepo: LeadRepository = new LeadRepository(),
    private readonly quotationRepo: QuotationRepository = new QuotationRepository(),
    private readonly employeeRepo: EmployeeRepository = new EmployeeRepository()
  ) {}

  /**
   * Helper to check if a user is an administrative or management user
   */
  private isManagement(user?: JwtPayload): boolean {
    return user?.role === APP_CONSTANTS.ROLES.ADMIN || user?.role === APP_CONSTANTS.ROLES.MANAGER;
  }

  /**
   * Helper to check if a user is in Accountant Office
   */
  private isAccountantOffice(user?: JwtPayload): boolean {
    return user?.role === APP_CONSTANTS.ROLES.USER && user?.designation === 'Accountant Office';
  }

  /**
   * Check if user has permission to access / view a follow-up
   */
  private async canAccessFollowUp(followUp: FollowUpWithRelations, authUser: JwtPayload): Promise<boolean> {
    if (this.isManagement(authUser) || this.isAccountantOffice(authUser)) {
      return true;
    }

    // Direct assignment or creation
    if (followUp.assignedTo === authUser.userId || followUp.createdBy === authUser.userId) {
      return true;
    }

    // Related Quotation ownership
    if (followUp.quotationId) {
      const [quote] = await db
        .select({ salespersonId: quotations.salespersonId })
        .from(quotations)
        .where(eq(quotations.id, followUp.quotationId))
        .limit(1);
      if (quote && quote.salespersonId === authUser.userId) {
        return true;
      }
    }

    // Related Lead ownership
    if (followUp.leadId || followUp.dealId) {
      const targetLeadId = followUp.leadId || followUp.dealId;
      if (targetLeadId) {
        const [lead] = await db
          .select({ assignedEmployeeId: leads.assignedEmployeeId, createdById: leads.createdById })
          .from(leads)
          .where(eq(leads.id, targetLeadId))
          .limit(1);
        if (
          lead &&
          (lead.assignedEmployeeId === authUser.userId || lead.createdById === authUser.userId)
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if user has permission to mutate (update, complete, reschedule, cancel) a follow-up
   */
  private async canMutateFollowUp(followUp: FollowUpWithRelations, authUser: JwtPayload): Promise<boolean> {
    if (this.isAccountantOffice(authUser)) {
      return false; // Accountant Office is strictly read-only
    }

    if (this.isManagement(authUser)) {
      return true;
    }

    return this.canAccessFollowUp(followUp, authUser);
  }

  /**
   * Create a new follow-up with integrity and relationship checks
   */
  async createFollowUp(input: CreateFollowUpInput, authUser: JwtPayload) {
    if (this.isAccountantOffice(authUser)) {
      throw AppError.forbidden('Accountant Office is not permitted to create follow-ups');
    }

    // 1. Validate Customer if provided
    if (input.customerId) {
      const customer = await this.customerRepo.findById(input.customerId);
      if (!customer) {
        throw AppError.notFound('Associated customer not found');
      }
      if (customer.status !== 'ACTIVE') {
        throw AppError.badRequest('Cannot schedule follow-up for an inactive customer');
      }
    }

    // 2. Validate Lead if provided
    if (input.leadId) {
      const lead = await this.leadRepo.findById(input.leadId, authUser);
      if (!lead) {
        throw AppError.notFound('Associated lead not found or you are not authorized to access it');
      }
    }

    // 3. Validate Deal (Lead) if provided
    if (input.dealId) {
      const deal = await this.leadRepo.findById(input.dealId, authUser);
      if (!deal) {
        throw AppError.notFound('Associated deal not found or you are not authorized to access it');
      }
    }

    // 4. Validate Quotation if provided
    if (input.quotationId) {
      const quotation = await this.quotationRepo.findById(input.quotationId);
      if (!quotation) {
        throw AppError.notFound('Associated quotation not found');
      }
      // Check quotation ownership if non-management
      if (!this.isManagement(authUser) && quotation.salespersonId !== authUser.userId) {
        throw AppError.forbidden('You are not authorized to schedule follow-ups for this quotation');
      }
    }

    // 5. Validate AMC Contract if provided
    if (input.amcContractId) {
      const [amc] = await db
        .select({ id: amcContracts.id, status: amcContracts.status })
        .from(amcContracts)
        .where(eq(amcContracts.id, input.amcContractId))
        .limit(1);
      if (!amc) {
        throw AppError.notFound('Associated AMC contract not found');
      }
    }

    // 6. Assigned Employee validation
    let assignedEmployeeId = input.assignedTo;
    if (assignedEmployeeId) {
      const employee = await this.employeeRepo.findById(assignedEmployeeId);
      if (!employee) {
        throw AppError.notFound('Assigned employee not found');
      }
      if (employee.status !== 'ACTIVE') {
        throw AppError.badRequest('Cannot assign follow-up to an inactive employee');
      }

      // Non-management sales/service reps cannot reassign to arbitrary employees outside their authorization
      if (!this.isManagement(authUser) && assignedEmployeeId !== authUser.userId) {
        // Only allow self assignment unless admin/manager
        throw AppError.forbidden('You can only assign follow-ups to yourself');
      }
    } else {
      // Default to the creator if not explicitly assigned
      assignedEmployeeId = authUser.userId;
    }

    // 7. Generate follow-up number safely
    const followUpNumber = await this.followUpRepo.generateFollowUpNumber();

    // 8. Insert follow-up
    const created = await this.followUpRepo.create({
      followUpNumber,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      priority: input.priority || FOLLOW_UP_PRIORITY.MEDIUM,
      status: FOLLOW_UP_STATUS.PENDING,
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime || null,
      assignedTo: assignedEmployeeId,
      createdBy: authUser.userId,
      customerId: input.customerId || null,
      leadId: input.leadId || null,
      dealId: input.dealId || null,
      quotationId: input.quotationId || null,
      amcContractId: input.amcContractId || null,
    });

    // 9. Add activity log on lead if applicable
    if (input.leadId || input.dealId) {
      const targetLeadId = input.leadId || input.dealId;
      if (targetLeadId) {
        try {
          await this.leadRepo.addActivityLog(
            targetLeadId,
            {
              title: `Follow-up scheduled: ${input.title} (${input.type}) on ${input.scheduledDate}`,
              type: 'Follow-up',
            },
            authUser
          );
        } catch {
          // Non-blocking log
        }
      }
    }

    return this.followUpRepo.findById(created.id);
  }

  /**
   * Get single follow-up with IDOR protection
   */
  async getFollowUpById(id: string, authUser: JwtPayload) {
    const followUp = await this.followUpRepo.findById(id);
    if (!followUp) {
      throw AppError.notFound('Follow-up not found');
    }

    const hasAccess = await this.canAccessFollowUp(followUp, authUser);
    if (!hasAccess) {
      // Resource isolation / IDOR guard
      throw AppError.notFound('Follow-up not found');
    }

    return followUp;
  }

  /**
   * List follow-ups with search, filters, pagination, and RBAC scoping
   */
  async listFollowUps(options: FollowUpFilterOptions, authUser: JwtPayload) {
    // If regular user (non-management and not Accountant Office), scope records
    if (!this.isManagement(authUser) && !this.isAccountantOffice(authUser)) {
      options.scopedAssignedTo = authUser.userId;

      // Find leads owned by the user
      const userLeads = await db
        .select({ id: leads.id })
        .from(leads)
        .where(
          eq(leads.assignedEmployeeId, authUser.userId)
        );
      options.scopedLeadIds = userLeads.map((l) => l.id);

      // Find quotations owned by the user
      const userQuotes = await db
        .select({ id: quotations.id })
        .from(quotations)
        .where(eq(quotations.salespersonId, authUser.userId));
      options.scopedQuotationIds = userQuotes.map((q) => q.id);
    }

    const result = await this.followUpRepo.findAll(options);
    const totalPages = Math.ceil(result.total / (options.limit || 20)) || 1;

    return {
      followUps: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
      },
    };
  }

  /**
   * Get metrics for follow-up dashboard widgets
   */
  async getMetrics(authUser: JwtPayload) {
    const scopedUser = !this.isManagement(authUser) && !this.isAccountantOffice(authUser) ? authUser.userId : undefined;
    return this.followUpRepo.getMetrics(scopedUser);
  }

  /**
   * Update follow-up details
   */
  async updateFollowUp(id: string, input: UpdateFollowUpInput, authUser: JwtPayload) {
    const existing = await this.followUpRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Follow-up not found');
    }

    const canMutate = await this.canMutateFollowUp(existing, authUser);
    if (!canMutate) {
      throw AppError.forbidden('You do not have permission to update this follow-up');
    }

    if (existing.status === FOLLOW_UP_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed follow-ups cannot be modified');
    }
    if (existing.status === FOLLOW_UP_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled follow-ups cannot be modified');
    }

    // Validate assigned employee if changed
    if (input.assignedTo && input.assignedTo !== existing.assignedTo) {
      if (!this.isManagement(authUser)) {
        throw AppError.forbidden('You do not have permission to reassign this follow-up');
      }
      const employee = await this.employeeRepo.findById(input.assignedTo);
      if (!employee || employee.status !== 'ACTIVE') {
        throw AppError.badRequest('Assigned employee is invalid or inactive');
      }
    }

    await this.followUpRepo.update(id, {
      ...(input.title && { title: input.title.trim() }),
      ...(input.description !== undefined && { description: input.description?.trim() || null }),
      ...(input.type && { type: input.type }),
      ...(input.priority && { priority: input.priority }),
      ...(input.scheduledDate && { scheduledDate: input.scheduledDate }),
      ...(input.scheduledTime !== undefined && { scheduledTime: input.scheduledTime || null }),
      ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo || null }),
      ...(input.customerId !== undefined && { customerId: input.customerId || null }),
      ...(input.leadId !== undefined && { leadId: input.leadId || null }),
      ...(input.dealId !== undefined && { dealId: input.dealId || null }),
      ...(input.quotationId !== undefined && { quotationId: input.quotationId || null }),
      ...(input.amcContractId !== undefined && { amcContractId: input.amcContractId || null }),
    });

    return this.followUpRepo.findById(id);
  }

  /**
   * Complete a follow-up, record outcome, and optionally schedule next follow-up
   */
  async completeFollowUp(id: string, input: CompleteFollowUpInput, authUser: JwtPayload) {
    const existing = await this.followUpRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Follow-up not found');
    }

    const canMutate = await this.canMutateFollowUp(existing, authUser);
    if (!canMutate) {
      throw AppError.forbidden('You do not have permission to complete this follow-up');
    }

    if (existing.status === FOLLOW_UP_STATUS.COMPLETED) {
      throw AppError.badRequest('This follow-up is already completed');
    }
    if (existing.status === FOLLOW_UP_STATUS.CANCELLED) {
      throw AppError.badRequest('Cannot complete a cancelled follow-up');
    }

    let nextFollowUpEntityId: string | null = null;

    // Create next follow up if requested
    if (input.createNextFollowUp && input.nextFollowUpDate) {
      const nextFollowUpNumber = await this.followUpRepo.generateFollowUpNumber();
      const nextTitle =
        input.nextFollowUpTitle?.trim() || `Next Follow-up for ${existing.title}`;
      const nextType = input.nextFollowUpType || existing.type;

      const nextCreated = await this.followUpRepo.create({
        followUpNumber: nextFollowUpNumber,
        title: nextTitle,
        description: input.nextFollowUpNotes?.trim() || null,
        type: nextType,
        priority: existing.priority,
        status: FOLLOW_UP_STATUS.PENDING,
        scheduledDate: input.nextFollowUpDate,
        scheduledTime: input.nextFollowUpTime || null,
        assignedTo: existing.assignedTo || authUser.userId,
        createdBy: authUser.userId,
        customerId: existing.customerId,
        leadId: existing.leadId,
        dealId: existing.dealId,
        quotationId: existing.quotationId,
        amcContractId: existing.amcContractId,
        rescheduledFromId: existing.id,
      });

      nextFollowUpEntityId = nextCreated.id;
    }

    // Complete the current follow-up
    await this.followUpRepo.update(id, {
      status: FOLLOW_UP_STATUS.COMPLETED,
      completedAt: new Date(),
      completedBy: authUser.userId,
      outcome: input.outcome.trim() + (input.notes ? `\n\nNotes: ${input.notes.trim()}` : ''),
      nextFollowUpId: nextFollowUpEntityId,
      nextFollowUpDate: input.nextFollowUpDate || null,
    });

    // Add activity log on lead if applicable
    if (existing.leadId || existing.dealId) {
      const targetLeadId = existing.leadId || existing.dealId;
      if (targetLeadId) {
        try {
          await this.leadRepo.addActivityLog(
            targetLeadId,
            {
              title: `Follow-up completed: ${existing.title}. Outcome: ${input.outcome}`,
              type: 'Follow-up',
            },
            authUser
          );
        } catch {
          // non-blocking
        }
      }
    }

    return this.followUpRepo.findById(id);
  }

  /**
   * Reschedule a pending follow-up
   */
  async rescheduleFollowUp(id: string, input: RescheduleFollowUpInput, authUser: JwtPayload) {
    const existing = await this.followUpRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Follow-up not found');
    }

    const canMutate = await this.canMutateFollowUp(existing, authUser);
    if (!canMutate) {
      throw AppError.forbidden('You do not have permission to reschedule this follow-up');
    }

    if (existing.status === FOLLOW_UP_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed follow-ups cannot be rescheduled');
    }
    if (existing.status === FOLLOW_UP_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled follow-ups cannot be rescheduled');
    }

    const reasonNote = input.reason
      ? `\n[Rescheduled from ${existing.scheduledDate} ${existing.scheduledTime || ''} to ${input.scheduledDate} ${input.scheduledTime || ''}: ${input.reason.trim()}]`
      : `\n[Rescheduled from ${existing.scheduledDate} to ${input.scheduledDate}]`;

    await this.followUpRepo.update(id, {
      scheduledDate: input.scheduledDate,
      scheduledTime: input.scheduledTime || null,
      description: existing.description ? existing.description + reasonNote : reasonNote.trim(),
    });

    // Log activity on lead if applicable
    if (existing.leadId || existing.dealId) {
      const targetLeadId = existing.leadId || existing.dealId;
      if (targetLeadId) {
        try {
          await this.leadRepo.addActivityLog(
            targetLeadId,
            {
              title: `Follow-up rescheduled to ${input.scheduledDate}: ${existing.title}`,
              type: 'Follow-up',
            },
            authUser
          );
        } catch {
          // non-blocking
        }
      }
    }

    return this.followUpRepo.findById(id);
  }

  /**
   * Cancel a follow-up
   */
  async cancelFollowUp(id: string, input: CancelFollowUpInput, authUser: JwtPayload) {
    const existing = await this.followUpRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Follow-up not found');
    }

    const canMutate = await this.canMutateFollowUp(existing, authUser);
    if (!canMutate) {
      throw AppError.forbidden('You do not have permission to cancel this follow-up');
    }

    if (existing.status === FOLLOW_UP_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed follow-ups cannot be cancelled');
    }
    if (existing.status === FOLLOW_UP_STATUS.CANCELLED) {
      throw AppError.badRequest('This follow-up is already cancelled');
    }

    await this.followUpRepo.update(id, {
      status: FOLLOW_UP_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: authUser.userId,
      cancellationReason: input.reason?.trim() || null,
    });

    return this.followUpRepo.findById(id);
  }

  /**
   * Delete a follow-up (Admin only)
   */
  async deleteFollowUp(id: string, authUser: JwtPayload) {
    if (authUser.role !== APP_CONSTANTS.ROLES.ADMIN) {
      throw AppError.forbidden('Only administrators can permanently delete follow-ups');
    }

    const existing = await this.followUpRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Follow-up not found');
    }

    return this.followUpRepo.delete(id);
  }
}
