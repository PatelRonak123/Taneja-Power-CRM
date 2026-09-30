import { Request, Response, NextFunction } from 'express';
import { PurchaseOrderService } from '../services/purchase-order.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class PurchaseOrderController {
  constructor(private readonly poService: PurchaseOrderService = new PurchaseOrderService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.poService.listPurchaseOrders({
        search: req.query.search as string,
        status: req.query.status as string,
        supplierId: req.query.supplierId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page,
        limit,
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.data,
        'Purchase orders retrieved successfully',
        {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const po = await this.poService.getPurchaseOrderById(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        po,
        'Purchase order details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.poService.createPurchaseOrder(req.body, userId);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Purchase order created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.poService.updatePurchaseOrder(req.params.id, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Purchase order updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.poService.submitPurchaseOrder(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Purchase order submitted for approval'
      );
    } catch (error) {
      next(error);
    }
  };

  approve = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const result = await this.poService.approvePurchaseOrder(req.params.id, userId);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Purchase order approved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.poService.cancelPurchaseOrder(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Purchase order cancelled successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
