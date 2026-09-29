import { Request, Response, NextFunction } from 'express';
import { FollowUpService } from '../services/follow-up.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService = new FollowUpService()) {}

  /**
   * List follow-ups with filters, pagination, and RBAC
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const result = await this.followUpService.listFollowUps(req.query as any, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.followUps,
        'Follow-ups retrieved successfully',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get follow-up metrics for dashboard
   */
  getMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const metrics = await this.followUpService.getMetrics(req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        metrics,
        'Follow-up metrics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single follow-up by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.getFollowUpById(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        followUp,
        'Follow-up details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new follow-up
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.createFollowUp(req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        followUp,
        'Follow-up created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update follow-up details
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.updateFollowUp(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        followUp,
        'Follow-up updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete follow-up with outcome notes and optional next follow-up
   */
  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.completeFollowUp(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        followUp,
        'Follow-up completed successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Reschedule follow-up
   */
  reschedule = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.rescheduleFollowUp(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        followUp,
        'Follow-up rescheduled successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel follow-up
   */
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      const followUp = await this.followUpService.cancelFollowUp(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        followUp,
        'Follow-up cancelled successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete follow-up (Admin only)
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized();
      await this.followUpService.deleteFollowUp(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { id: req.params.id },
        'Follow-up deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
