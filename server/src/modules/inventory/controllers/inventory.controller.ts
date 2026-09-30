import { Request, Response, NextFunction } from 'express';
import { StockService } from '../services/stock.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class InventoryController {
  constructor(private readonly stockService: StockService = new StockService()) {}

  getCurrentInventory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.stockService.getCurrentInventory(req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.items,
        'Current inventory retrieved successfully',
        {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  getStockMovements = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { productId } = req.params;
      const result = await this.stockService.getStockMovements(productId, req.query as any);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.items,
        'Stock movements retrieved successfully',
        {
          total: result.total,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
        }
      );
    } catch (error) {
      next(error);
    }
  };

  adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = req.params.productId || req.body.productId;
      const result = await this.stockService.adjustStock(
        {
          ...req.body,
          productId,
        },
        req.user
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Stock adjusted successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  addStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = req.params.productId || req.body.productId;
      const result = await this.stockService.addStock(
        {
          ...req.body,
          productId,
        },
        req.user
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Stock added successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  removeStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const productId = req.params.productId || req.body.productId;
      const result = await this.stockService.removeStock(
        {
          ...req.body,
          productId,
        },
        req.user
      );
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Stock removed successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
