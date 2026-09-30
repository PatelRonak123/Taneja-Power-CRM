import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service.js';
import { EmployeeService } from '../../employees/services/employee.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';
import { isOfficeTaskManager, isSalesOfficeUser } from '../../../common/middleware/auth.middleware.js';

export class TaskController {
  constructor(
    private readonly taskService: TaskService = new TaskService(),
    private readonly employeeService: EmployeeService = new EmployeeService()
  ) {}

  getMyTasks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const employeeId = req.user?.userId;
      if (!employeeId) {
        throw AppError.unauthorized('User not authenticated');
      }

      const options = {
        ...req.query,
        assignedTo: employeeId,
      };

      const result = await this.taskService.listTasks(options as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.tasks,
        'My tasks retrieved successfully',
        {
          ...result.pagination,
          metrics: result.metrics,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) throw AppError.unauthorized('User not authenticated');

      // Sales Office & Service Office: see only tasks they created (scoped metrics too)
      if (isOfficeTaskManager(req.user)) {
        const result = await this.taskService.listTasksForCreatedBy(userId, req.query as any);
        sendResponse(
          res,
          APP_CONSTANTS.HTTP_STATUS.OK,
          result.tasks,
          'Tasks retrieved successfully',
          {
            ...result.pagination,
            metrics: result.metrics,
          }
        );
        return;
      }

      // Admin / Manager: see all tasks
      const result = await this.taskService.listTasks(req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.tasks,
        'Tasks retrieved successfully',
        {
          ...result.pagination,
          metrics: result.metrics,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.taskService.getTaskById(req.params.id);

      // Field USER (not an office task manager): can only view tasks assigned to them
      if (
        req.user &&
        req.user.role === APP_CONSTANTS.ROLES.USER &&
        !isOfficeTaskManager(req.user) &&
        result.assignedTo !== req.user.userId
      ) {
        throw AppError.forbidden('You do not have permission to access this task');
      }

      // Sales Office & Service Office: can only view tasks they created
      if (isOfficeTaskManager(req.user) && result.createdBy !== req.user?.userId) {
        throw AppError.forbidden('You do not have permission to access this task');
      }

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const createdById = req.user?.userId;
      if (!createdById) {
        throw AppError.unauthorized('User not authenticated');
      }
      const result = await this.taskService.createTask(req.body, createdById);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Task created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Sales Office & Service Office: can only update tasks they created
      if (isOfficeTaskManager(req.user)) {
        const existing = await this.taskService.getTaskById(req.params.id);
        if (existing.createdBy !== req.user?.userId) {
          throw AppError.forbidden('You can only edit tasks you created');
        }
      }

      const result = await this.taskService.updateTask(req.params.id, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Sales Office & Service Office: can only cancel tasks they created
      if (isOfficeTaskManager(req.user)) {
        const existing = await this.taskService.getTaskById(req.params.id);
        if (existing.createdBy !== req.user?.userId) {
          throw AppError.forbidden('You can only cancel tasks you created');
        }
      }

      const result = await this.taskService.cancelTask(req.params.id, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task cancelled successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.taskService.deleteTask(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { id: req.params.id },
        'Task removed successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  startTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.taskService.startTask(req.params.id, userId, userRole, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task started successfully. Live tracking enabled.'
      );
    } catch (error) {
      next(error);
    }
  };

  updateLocation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.taskService.updateTaskLocation(req.params.id, userId, userRole, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task location updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  completeTask = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        throw AppError.unauthorized('User not authenticated');
      }

      const notes = req.body?.notes;
      const result = await this.taskService.completeTask(req.params.id, userId, userRole, notes, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task completed successfully. Live tracking terminated.'
      );
    } catch (error) {
      next(error);
    }
  };

  getActiveTracking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.taskService.getActiveTrackingTasks();
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Active tracking tasks retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getTaskTracking = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;
      if (!userId || !userRole) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.taskService.getTaskTracking(req.params.id, userId, userRole);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Task live tracking data retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns active FIELD employees with service-type designations only.
   * Used by Service Office users for task assignment.
   * Strictly excludes Sales field employees.
   */
  getFieldEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.listEmployees({
        workType: APP_CONSTANTS.WORK_TYPES.FIELD,
        status: APP_CONSTANTS.STATUS.ACTIVE,
        limit: 200,
        page: 1,
      });

      // Designations that belong to SALES field employees — exclude them
      const salesDesignations = new Set([
        ...APP_CONSTANTS.DESIGNATIONS.LEGACY_FIELD_SALES.map((d) => d.toLowerCase()),
        'sales',
      ]);

      const serviceFieldEmployees = result.employees.filter((emp) => {
        const des = (emp.designation || '').toLowerCase();
        if (salesDesignations.has(des)) return false;
        if (des.startsWith('sales') && !des.includes('service')) return false;
        return true;
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        serviceFieldEmployees,
        'Field service employees retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Returns active FIELD employees with sales-type designations only.
   * Used by Sales Office users for task assignment.
   * Strictly excludes Service field employees.
   */
  getSalesFieldEmployees = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.employeeService.listEmployees({
        workType: APP_CONSTANTS.WORK_TYPES.FIELD,
        status: APP_CONSTANTS.STATUS.ACTIVE,
        limit: 200,
        page: 1,
      });

      // Designations that belong to SERVICE field employees — exclude them
      const serviceDesignations = new Set([
        ...APP_CONSTANTS.DESIGNATIONS.LEGACY_FIELD_SERVICE.map((d) => d.toLowerCase()),
        'service',
      ]);

      const salesFieldEmployees = result.employees.filter((emp) => {
        const des = (emp.designation || '').toLowerCase();
        if (serviceDesignations.has(des)) return false;
        if (des.startsWith('service') && !des.includes('sales')) return false;
        return true;
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        salesFieldEmployees,
        'Sales field employees retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}



