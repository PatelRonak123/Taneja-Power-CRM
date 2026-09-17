import { Request, Response, NextFunction } from 'express';
import { TaskService } from '../services/task.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export class TaskController {
  constructor(private readonly taskService: TaskService = new TaskService()) {}

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

      // If user is a field employee (USER role), verify they are assigned to this task
      if (
        req.user &&
        req.user.role === APP_CONSTANTS.ROLES.USER &&
        result.assignedTo !== req.user.userId
      ) {
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
}
