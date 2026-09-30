import { Request, Response, NextFunction } from 'express';
import { GoodsReceiptService } from '../services/goods-receipt.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class GoodsReceiptController {
  constructor(private readonly grnService: GoodsReceiptService = new GoodsReceiptService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.grnService.listGoodsReceipts({
        search: req.query.search as string,
        status: req.query.status as string,
        purchaseOrderId: req.query.purchaseOrderId as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page,
        limit,
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.data,
        'Goods receipts retrieved successfully',
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
      const grn = await this.grnService.getGoodsReceiptById(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        grn,
        'Goods receipt details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.grnService.createGoodsReceipt(req.body, user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Goods receipt created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  post = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const result = await this.grnService.postGoodsReceipt(req.params.id, user);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Goods receipt posted and inventory updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
