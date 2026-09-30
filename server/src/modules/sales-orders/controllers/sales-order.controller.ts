import { Request, Response, NextFunction } from 'express';
import { SalesOrderService } from '../services/sales-order.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class SalesOrderController {
  constructor(private readonly soService: SalesOrderService = new SalesOrderService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.soService.listSalesOrders({
        search: req.query.search as string,
        status: req.query.status as string,
        customerId: req.query.customerId as string,
        quotationId: req.query.quotationId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page,
        limit,
      });

      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.data, 'Sales orders retrieved successfully', {
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
      const so = await this.soService.getSalesOrderById(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, so, 'Sales order retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = { id: (req as any).user?.userId || (req as any).user?.id };
      const result = await this.soService.createSalesOrder(req.body, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Sales order created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.soService.updateSalesOrder(req.params.id, req.body);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales order updated successfully');
    } catch (error) {
      next(error);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = { id: (req as any).user?.userId || (req as any).user?.id };
      const result = await this.soService.submitSalesOrder(req.params.id, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales order submitted for confirmation');
    } catch (error) {
      next(error);
    }
  };

  confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = { id: (req as any).user?.userId || (req as any).user?.id };
      const result = await this.soService.confirmSalesOrder(req.params.id, authUser);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales order confirmed successfully');
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authUser = { id: (req as any).user?.userId || (req as any).user?.id };
      const result = await this.soService.cancelSalesOrder(
        req.params.id,
        { cancellationReason: req.body.cancellationReason },
        authUser
      );
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Sales order cancelled successfully');
    } catch (error) {
      next(error);
    }
  };
}
