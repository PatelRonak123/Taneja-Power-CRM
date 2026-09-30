import { Request, Response, NextFunction } from 'express';
import { SalesInvoiceService } from '../services/sales-invoice.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class SalesInvoiceController {
  constructor(private readonly service: SalesInvoiceService = new SalesInvoiceService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.service.list({
        search: req.query.search as string,
        status: req.query.status as string,
        customerId: req.query.customerId as string,
        salesOrderId: req.query.salesOrderId as string,
        page,
        limit,
      });

      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.data, 'Sales invoices retrieved successfully', {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const inv = await this.service.getById(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, inv, 'Sales invoice retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  createFromSalesOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.service.createFromSalesOrder(req.params.salesOrderId, req.body, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Sales invoice created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.service.update(req.params.id, req.body, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales invoice updated successfully');
    } catch (error) {
      next(error);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.service.submit(req.params.id, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales invoice submitted for issue successfully');
    } catch (error) {
      next(error);
    }
  };

  issue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.service.issue(req.params.id, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales invoice officially issued successfully');
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.service.cancel(req.params.id, req.body.cancellationReason, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales invoice cancelled successfully');
    } catch (error) {
      next(error);
    }
  };

  getActivityLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const logs = await this.service.getActivityLogs(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, logs, 'Activity logs retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}
