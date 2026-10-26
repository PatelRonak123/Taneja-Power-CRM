import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service.js';
import { excelCatalogueImporterService } from '../services/excel-catalogue-importer.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class ProductController {
  constructor(private readonly productService: ProductService = new ProductService()) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.listProducts(req.query as any, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.items, 'Products retrieved successfully', result.meta);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.getProductById(req.params.id, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Product retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.createProduct(req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.updateProduct(req.params.id, req.body, req.user);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.productService.deleteProduct(req.params.id);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, { id: req.params.id }, 'Product deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  importExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileData, mode, dryRun } = req.body;
      const result = await excelCatalogueImporterService.importFromBase64(fileData, {
        mode,
        dryRun,
      });
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        result.dryRun
          ? 'Excel catalogue validation passed (dry-run, no database changes)'
          : 'Excel catalogue imported and seeded successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  seedExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filePath, mode, dryRun } = req.body || {};
      const result = await excelCatalogueImporterService.importFromFile(filePath, {
        mode,
        dryRun,
      });
      sendResponse(
        res,
        APP_CONSTANTS.HTTP_STATUS.OK,
        result,
        result.dryRun
          ? 'Server Excel catalogue validation passed (dry-run)'
          : 'Server master Excel file seeded successfully'
      );
    } catch (error) {
      next(error);
    }
  };
}

