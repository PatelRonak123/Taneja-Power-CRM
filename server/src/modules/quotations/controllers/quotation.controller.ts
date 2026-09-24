import { Request, Response, NextFunction } from 'express';
import { QuotationService } from '../services/quotation.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';
import { AppError } from '../../../common/errors/AppError.js';

export class QuotationController {
  constructor(private readonly quotationService: QuotationService = new QuotationService()) {}

  /**
   * POST /api/v1/quotations
   * Create a new quotation
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.createQuotation(req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Quotation created successfully as Draft'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations
   * List quotations with pagination & search filters
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.quotationService.listQuotations(req.query as any, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.quotations,
        'Quotations retrieved successfully',
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id
   * Get single quotation details with active revision
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.quotationService.getQuotationById(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/v1/quotations/:id
   * Update a draft quotation, or edit a pending quotation (auto-withdraws submission)
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.updateQuotation(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/submit
   * Submit draft quotation for management approval
   */
  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.submitForApproval(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation submitted for approval successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/approve
   * Approve pending quotation (Admin / Manager)
   */
  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.approveQuotation(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation approved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/reject
   * Reject pending quotation (Admin / Manager)
   */
  reject = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.rejectQuotation(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation rejected successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/withdraw
   * Withdraw pending approval submission
   */
  withdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.withdrawSubmission(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation approval submission withdrawn successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/revisions
   * Create a new formal revision (Rev N+1)
   */
  createRevision = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.createFormalRevision(req.params.id, req.body, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'New quotation revision created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/revisions
   * Get all revisions list
   */
  getRevisions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.quotationService.getRevisionHistory(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation revisions retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/revisions/:revisionNumber
   * Get specific revision details and its items
   */
  getRevisionByNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const revisionNumber = parseInt(req.params.revisionNumber, 10);
      const result = await this.quotationService.getSpecificRevision(req.params.id, revisionNumber, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        `Revision ${revisionNumber} retrieved successfully`
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/approvals
   * Get full approval audit trail
   */
  getApprovals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.quotationService.getApprovalHistory(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation approval history retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/activity
   * Get full activity log stream
   */
  getActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.quotationService.getActivityHistory(req.params.id, req.user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Quotation activity history retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/pdf
   * Generate and stream authoritative PDF for active revision
   */
  getPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { buffer, filename } = await this.quotationService.generatePdf(req.params.id, undefined, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/v1/quotations/:id/revisions/:revisionNumber/pdf
   * Generate and stream authoritative PDF for specific historical revision
   */
  getRevisionPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const revisionNumber = parseInt(req.params.revisionNumber, 10);
      const { buffer, filename } = await this.quotationService.generatePdf(req.params.id, revisionNumber, req.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/v1/quotations/:id/send-email
   * Send quotation PDF attachment directly to customer email using Resend
   */
  sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw AppError.unauthorized('User not authenticated');
      }

      const result = await this.quotationService.sendQuotationEmailToCustomer(
        req.params.id,
        req.body,
        req.user
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        result.message || 'Quotation PDF successfully emailed to customer'
      );
    } catch (error) {
      next(error);
    }
  };
}

