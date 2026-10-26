import { Request, Response, NextFunction } from 'express';
import { ProformaInvoiceService } from '../services/proforma-invoice.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import {
  createProformaInvoiceSchema,
  updateProformaInvoiceSchema,
  cancelProformaInvoiceSchema,
  sendProformaEmailSchema,
  listProformaInvoicesQuerySchema,
} from '../validators/proforma-invoice.validator.js';

export class ProformaInvoiceController {
  private service = new ProformaInvoiceService();

  /**
   * Helper to safely extract authenticated user ID
   */
  private getUserId(req: Request): string {
    return (req as any).user?.userId || (req as any).user?.id || '';
  }

  /**
   * POST /api/v1/proforma-invoices/from-sales-order/:salesOrderId
   */
  createFromSalesOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { salesOrderId } = req.params;
      const validated = createProformaInvoiceSchema.parse(req.body);
      const userId = this.getUserId(req);

      const result = await this.service.createFromSalesOrder(salesOrderId, validated, userId);
      sendResponse(res, 201, result, 'Pro Forma Invoice generated successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/proforma-invoices
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = listProformaInvoicesQuerySchema.parse(req.query);
      const result = await this.service.list(query);
      sendResponse(res, 200, result, 'Pro Forma Invoices retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/v1/proforma-invoices/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.service.getById(id);
      sendResponse(res, 200, result, 'Pro Forma Invoice retrieved successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * PATCH /api/v1/proforma-invoices/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validated = updateProformaInvoiceSchema.parse(req.body);
      const userId = this.getUserId(req);

      const result = await this.service.update(id, validated, userId);
      sendResponse(res, 200, result, 'Pro Forma Invoice updated successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/proforma-invoices/:id/issue
   */
  issue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = this.getUserId(req);

      const result = await this.service.issue(id, userId);
      sendResponse(res, 200, result, 'Pro Forma Invoice issued successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/proforma-invoices/:id/cancel
   */
  cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validated = cancelProformaInvoiceSchema.parse(req.body);
      const userId = this.getUserId(req);

      const result = await this.service.cancel(id, validated, userId);
      sendResponse(res, 200, result, 'Pro Forma Invoice cancelled successfully');
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/v1/proforma-invoices/:id/send-email
   */
  sendEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const validated = sendProformaEmailSchema.parse(req.body);
      const userId = this.getUserId(req);

      const result = await this.service.sendEmail(id, validated, userId);
      sendResponse(res, 200, result, 'Pro Forma Invoice sent to customer email successfully');
    } catch (err) {
      next(err);
    }
  };
}
