import { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class SupplierController {
  constructor(private readonly supplierService: SupplierService = new SupplierService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const result = await this.supplierService.listSuppliers({
        search: req.query.search as string,
        status: req.query.status as string,
        productId: req.query.productId as string,
        page,
        limit,
      });

      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result.data,
        'Suppliers retrieved successfully',
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

  getNextCode = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nextCode = await this.supplierService.getNextSupplierCode();
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { nextCode },
        'Next supplier code generated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const supplier = await this.supplierService.getSupplierById(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        supplier,
        'Supplier details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.supplierService.createSupplier(req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.CREATED,
        result,
        'Supplier created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.supplierService.updateSupplier(req.params.id, req.body);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Supplier updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.supplierService.deleteSupplier(req.params.id);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        { id: req.params.id },
        'Supplier deleted successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  setStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.supplierService.setSupplierStatus(req.params.id, req.body.status);
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        'Supplier status updated successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}
