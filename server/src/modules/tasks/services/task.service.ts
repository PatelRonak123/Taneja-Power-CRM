import {
  TaskRepository,
  TaskFilterOptions,
  TaskWithDetails,
  TaskMetricsDto,
} from '../repositories/task.repository.js';
import { CustomerRepository } from '../../customers/repositories/customer.repository.js';
import { DestinationRepository } from '../../customers/repositories/destination.repository.js';
import { EmployeeRepository } from '../../employees/repositories/employee.repository.js';
import {
  CreateTaskInput,
  UpdateTaskInput,
  CancelTaskInput,
} from '../validators/task.validator.js';
import { TASK_STATUS, TASK_PRIORITY } from '../constants/task.constants.js';
import { AppError } from '../../../common/errors/AppError.js';
import { TaskEntity } from '../../../database/schema/tasks.js';

export class TaskService {
  constructor(
    private readonly taskRepo: TaskRepository = new TaskRepository(),
    private readonly customerRepo: CustomerRepository = new CustomerRepository(),
    private readonly destinationRepo: DestinationRepository = new DestinationRepository(),
    private readonly employeeRepo: EmployeeRepository = new EmployeeRepository()
  ) {}

  async listTasks(options: TaskFilterOptions) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const [{ data, total }, metrics] = await Promise.all([
      this.taskRepo.findAll(options),
      this.taskRepo.getMetrics(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tasks: data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      metrics,
    };
  }

  /**
   * Lists only tasks created by the specified user, with metrics scoped to
   * their own tasks. Used for Service Office users who should only see and
   * track tasks they personally created.
   */
  async listTasksForCreatedBy(createdById: string, options: Omit<TaskFilterOptions, 'createdBy'>) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const scopedOptions: TaskFilterOptions = { ...options, createdBy: createdById };

    const [{ data, total }, metrics] = await Promise.all([
      this.taskRepo.findAll(scopedOptions),
      this.taskRepo.getMetricsForCreatedBy(createdById),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tasks: data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      metrics,
    };
  }


  async getTaskById(id: string): Promise<TaskWithDetails> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw AppError.notFound('Task not found');
    }
    return task;
  }

  async createTask(input: CreateTaskInput, createdById: string): Promise<TaskEntity> {
    // 1. Validate Customer
    const customer = await this.customerRepo.findById(input.customerId);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    if (customer.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot create task for an inactive customer');
    }

    // 2. Validate Destination
    const destination = await this.destinationRepo.findById(input.destinationId);
    if (!destination) {
      throw AppError.notFound('Destination not found');
    }
    if (destination.customerId !== input.customerId) {
      throw AppError.badRequest('Destination does not belong to the selected customer');
    }
    if (destination.status !== 'ACTIVE') {
      throw AppError.badRequest('Cannot create task for an inactive destination');
    }

    // 3. Validate Assigned Employee if provided
    let initialStatus: string = TASK_STATUS.CREATED;
    if (input.assignedTo) {
      const employee = await this.employeeRepo.findById(input.assignedTo);
      if (!employee) {
        throw AppError.notFound('Assigned employee not found');
      }
      if (employee.status !== 'ACTIVE') {
        throw AppError.badRequest('Cannot assign task to an inactive employee');
      }
      initialStatus = TASK_STATUS.ASSIGNED;
    }

    // 4. Validate Due Date vs Scheduled Date
    if (input.scheduledAt && input.dueAt && input.dueAt < input.scheduledAt) {
      throw AppError.badRequest('Due date/time cannot be earlier than scheduled date/time');
    }

    // 5. Insert Task
    return this.taskRepo.create({
      title: input.title,
      description: input.description || null,
      customerId: input.customerId,
      destinationId: input.destinationId,
      assignedTo: input.assignedTo || null,
      priority: input.priority || TASK_PRIORITY.MEDIUM,
      status: initialStatus,
      scheduledAt: input.scheduledAt || null,
      dueAt: input.dueAt || null,
      createdBy: createdById,
    });
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<TaskEntity> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    // Protect finalized tasks
    if (existing.status === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed tasks cannot be modified');
    }
    if (existing.status === TASK_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled tasks cannot be modified');
    }

    const targetCustomerId = input.customerId || existing.customerId;
    const targetDestinationId = input.destinationId || existing.destinationId;

    // Validate customer if changed
    if (input.customerId && input.customerId !== existing.customerId) {
      const customer = await this.customerRepo.findById(input.customerId);
      if (!customer) {
        throw AppError.notFound('Customer not found');
      }
      if (customer.status !== 'ACTIVE') {
        throw AppError.badRequest('Cannot assign task to an inactive customer');
      }
    }

    // Validate destination if customer or destination changed
    if (input.destinationId || input.customerId) {
      const destination = await this.destinationRepo.findById(targetDestinationId);
      if (!destination) {
        throw AppError.notFound('Destination not found');
      }
      if (destination.customerId !== targetCustomerId) {
        throw AppError.badRequest('Destination does not belong to the selected customer');
      }
      if (destination.status !== 'ACTIVE') {
        throw AppError.badRequest('Cannot assign task to an inactive destination');
      }
    }

    // Validate assigned employee if changed
    if (input.assignedTo !== undefined) {
      if (input.assignedTo) {
        const employee = await this.employeeRepo.findById(input.assignedTo);
        if (!employee) {
          throw AppError.notFound('Assigned employee not found');
        }
        if (employee.status !== 'ACTIVE') {
          throw AppError.badRequest('Cannot assign task to an inactive employee');
        }
      }
    }

    const updateData: any = {};
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description || null;
    if (input.customerId !== undefined) updateData.customerId = input.customerId;
    if (input.destinationId !== undefined) updateData.destinationId = input.destinationId;
    if (input.assignedTo !== undefined) {
      updateData.assignedTo = input.assignedTo || null;
      // Auto-update status if it was CREATED and now has an assignee
      if (existing.status === TASK_STATUS.CREATED && input.assignedTo) {
        updateData.status = TASK_STATUS.ASSIGNED;
      }
    }
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.scheduledAt !== undefined) updateData.scheduledAt = input.scheduledAt || null;
    if (input.dueAt !== undefined) updateData.dueAt = input.dueAt || null;

    // Handle status changes if explicitly requested
    if (input.status && input.status !== existing.status) {
      this.validateStatusTransition(existing.status, input.status);
      updateData.status = input.status;

      if (input.status === TASK_STATUS.IN_PROGRESS && !existing.startedAt) {
        updateData.startedAt = new Date();
      }
      if (input.status === TASK_STATUS.COMPLETED && !existing.completedAt) {
        updateData.completedAt = new Date();
      }
    }

    const updated = await this.taskRepo.update(id, updateData);
    if (!updated) {
      throw AppError.internal('Failed to update task');
    }

    return updated;
  }

  async cancelTask(id: string, input: CancelTaskInput): Promise<TaskEntity> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    if (existing.status === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed tasks cannot be cancelled');
    }
    if (existing.status === TASK_STATUS.CANCELLED) {
      throw AppError.badRequest('Task is already cancelled');
    }

    const updated = await this.taskRepo.update(id, {
      status: TASK_STATUS.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.cancellationReason,
    });

    if (!updated) {
      throw AppError.internal('Failed to cancel task');
    }

    return updated;
  }

  async deleteTask(id: string): Promise<void> {
    const existing = await this.taskRepo.findById(id);
    if (!existing) {
      throw AppError.notFound('Task not found');
    }

    if (existing.status === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Cannot delete completed task records. Historical records must be preserved.');
    }
    if (existing.status === TASK_STATUS.IN_PROGRESS) {
      throw AppError.badRequest('Cannot delete in-progress task. Please cancel the task instead.');
    }

    await this.taskRepo.delete(id);
  }

  async startTask(
    id: string,
    userId: string,
    userRole: string,
    coords?: { latitude?: number | null; longitude?: number | null }
  ): Promise<TaskWithDetails> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    // Role check: field employees can only start tasks assigned to them
    if (userRole === 'USER' && task.assignedTo !== userId) {
      throw AppError.forbidden('You are not authorized to start this task');
    }

    if (task.status === TASK_STATUS.IN_PROGRESS) {
      throw AppError.badRequest('Task is already in progress');
    }
    if (task.status === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Task has already been completed');
    }
    if (task.status === TASK_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled tasks cannot be started');
    }

    const now = new Date();
    const updateData: any = {
      status: TASK_STATUS.IN_PROGRESS,
      startedAt: task.startedAt || now,
    };

    if (coords?.latitude !== undefined && coords?.latitude !== null && coords?.longitude !== undefined && coords?.longitude !== null) {
      updateData.currentLatitude = String(coords.latitude);
      updateData.currentLongitude = String(coords.longitude);
      updateData.lastLocationUpdatedAt = now;
    }

    const updated = await this.taskRepo.update(id, updateData);
    if (!updated) {
      throw AppError.internal('Failed to start task');
    }

    return (await this.taskRepo.findById(id))!;
  }

  async updateTaskLocation(
    id: string,
    userId: string,
    userRole: string,
    input: { latitude: number; longitude: number; accuracy?: number | null; timestamp?: number | null }
  ): Promise<{ id: string; currentLatitude: string; currentLongitude: string; lastLocationUpdatedAt: Date }> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    if (userRole === 'USER' && task.assignedTo !== userId) {
      throw AppError.forbidden('You are not authorized to update location for this task');
    }

    if (task.status !== TASK_STATUS.IN_PROGRESS) {
      throw AppError.badRequest('Live location tracking is only active for in-progress tasks');
    }

    const now = new Date();
    const updated = await this.taskRepo.update(id, {
      currentLatitude: String(input.latitude),
      currentLongitude: String(input.longitude),
      locationAccuracy: input.accuracy ? String(input.accuracy) : null,
      lastLocationUpdatedAt: now,
    });

    if (!updated) {
      throw AppError.internal('Failed to update task location');
    }

    return {
      id: updated.id,
      currentLatitude: String(updated.currentLatitude),
      currentLongitude: String(updated.currentLongitude),
      lastLocationUpdatedAt: updated.lastLocationUpdatedAt || now,
    };
  }

  async completeTask(
    id: string,
    userId: string,
    userRole: string,
    notes?: string | null,
    coords?: { latitude?: number | null; longitude?: number | null }
  ): Promise<TaskWithDetails> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    if (userRole === 'USER' && task.assignedTo !== userId) {
      throw AppError.forbidden('You are not authorized to complete this task');
    }

    if (task.status === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Task has already been completed');
    }
    if (task.status === TASK_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled tasks cannot be completed');
    }

    const now = new Date();
    const updateData: any = {
      status: TASK_STATUS.COMPLETED,
      completedAt: now,
    };

    if (notes) {
      updateData.description = task.description
        ? `${task.description}\n\n[Completion Notes]: ${notes}`
        : `[Completion Notes]: ${notes}`;
    }

    if (coords?.latitude !== undefined && coords?.latitude !== null && coords?.longitude !== undefined && coords?.longitude !== null) {
      updateData.currentLatitude = String(coords.latitude);
      updateData.currentLongitude = String(coords.longitude);
      updateData.lastLocationUpdatedAt = now;
    }

    const updated = await this.taskRepo.update(id, updateData);
    if (!updated) {
      throw AppError.internal('Failed to complete task');
    }

    return (await this.taskRepo.findById(id))!;
  }

  async getActiveTrackingTasks(): Promise<TaskWithDetails[]> {
    return this.taskRepo.findActiveTrackingTasks();
  }

  async getTaskTracking(id: string, userId: string, userRole: string): Promise<TaskWithDetails> {
    const task = await this.taskRepo.findById(id);
    if (!task) {
      throw AppError.notFound('Task not found');
    }

    if (userRole === 'USER' && task.assignedTo !== userId) {
      throw AppError.forbidden('You are not authorized to view tracking data for this task');
    }

    return task;
  }

  private validateStatusTransition(currentStatus: string, newStatus: string): void {
    if (currentStatus === newStatus) return;

    if (currentStatus === TASK_STATUS.COMPLETED) {
      throw AppError.badRequest('Completed tasks cannot change status');
    }
    if (currentStatus === TASK_STATUS.CANCELLED) {
      throw AppError.badRequest('Cancelled tasks cannot change status');
    }

    const allowedTransitions: Record<string, string[]> = {
      [TASK_STATUS.CREATED]: [TASK_STATUS.ASSIGNED, TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELLED],
      [TASK_STATUS.ASSIGNED]: [TASK_STATUS.IN_PROGRESS, TASK_STATUS.CANCELLED, TASK_STATUS.CREATED],
      [TASK_STATUS.IN_PROGRESS]: [TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw AppError.badRequest(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}
