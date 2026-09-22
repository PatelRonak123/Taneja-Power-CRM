import { Request, Response, NextFunction } from 'express';
import { FieldServiceService } from '../services/field-service.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export class FieldServiceController {
  constructor(private readonly fsrService: FieldServiceService = new FieldServiceService()) {}

  /**
   * POST /api/v1/field-service
   * Create a new Field Service Report
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.createFsr(req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Field Service Report created successfully as DRAFT'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/field-service
   * List FSRs with pagination, search & filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.listFsrs(req.query as any, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.fsrs,
        'Field Service Reports retrieved successfully',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/field-service/:id
   * Get single FSR complete structured details
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }
      const result = await this.fsrService.getFsrById(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Field Service Report details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/field-service/:id
   * Update FSR master & details
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.updateFsr(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Field Service Report updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/field-service/:id/assign
   * Assign or reassign Service Engineer (Admin & Manager only)
   */
  assign = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.assignFse(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Service Engineer assigned successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/field-service/:id/start
   * Start FSR (DRAFT -> IN_PROGRESS)
   */
  start = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.startFsr(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Field Service Report started and marked IN_PROGRESS'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/field-service/:id/site-observation
   * Upsert site observations data
   */
  updateSiteObservation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.fsrService.updateSiteObservation(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Site observations updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * Battery Bank Sub-Resources
   */
  addBatteryBank = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.addBatteryBank(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Battery bank added successfully');
    } catch (error) {
      next(error);
    }
  };

  updateBatteryBank = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.updateBatteryBank(
        req.params.id,
        req.params.bankId,
        req.body,
        req.user
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Battery bank updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteBatteryBank = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.deleteBatteryBank(req.params.id, req.params.bankId, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Battery bank deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Battery Reading Sub-Resources
   */
  addBatteryReadings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.addBatteryReadings(
        req.params.id,
        req.params.bankId,
        req.body,
        req.user
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Battery reading(s) recorded successfully');
    } catch (error) {
      next(error);
    }
  };

  updateBatteryReading = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.updateBatteryReading(
        req.params.id,
        req.params.bankId,
        req.params.readingId,
        req.body,
        req.user
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Battery reading updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteBatteryReading = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.deleteBatteryReading(
        req.params.id,
        req.params.bankId,
        req.params.readingId,
        req.user
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Battery reading deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Part Replacement Sub-Resources
   */
  addPart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.addPart(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Replaced part added successfully');
    } catch (error) {
      next(error);
    }
  };

  updatePart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.updatePart(req.params.id, req.params.partId, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Replaced part updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deletePart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.deletePart(req.params.id, req.params.partId, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Replaced part deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Customer Sign-Off
   */
  customerSignOff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.customerSignOff(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Customer sign-off recorded successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * FSE Sign-Off
   */
  fseSignOff = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.fseSignOff(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Service Engineer sign-off recorded successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Complete FSR (IN_PROGRESS -> COMPLETED)
   */
  complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.completeFsr(req.params.id, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Field Service Report marked COMPLETED');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Close FSR (COMPLETED -> CLOSED) (Admin & Manager only)
   */
  close = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.closeFsr(req.params.id, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Field Service Report successfully CLOSED');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Cancel FSR (Admin & Manager only)
   */
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const reason = req.body.reason || 'Cancelled by Administrator';
      const result = await this.fsrService.cancelFsr(req.params.id, reason, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Field Service Report CANCELLED');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete FSR (Admin only)
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.deleteFsr(req.params.id, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Field Service Report deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Attachment Sub-Resources
   */
  uploadAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.uploadAttachment(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Attachment uploaded successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteAttachment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.deleteAttachment(
        req.params.id,
        req.params.attachmentId,
        req.user
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Attachment deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Activity Stream
   */
  getActivityLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw AppError.unauthorized('User not authenticated');
      const result = await this.fsrService.getActivityLogs(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Field Service Report activity logs retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/field-service/:id/pdf
   * Generate and stream authoritative FSR PDF document
   */
  getPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const { buffer, filename } = await this.fsrService.generatePdf(req.params.id, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.status(APP_CONSTANTS.HTTP_STATUS.OK).send(buffer);
    } catch (error) {
      next(error);
    }
  };
}
