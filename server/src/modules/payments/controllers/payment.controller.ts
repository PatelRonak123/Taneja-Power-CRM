import { Request, Response, NextFunction } from 'express';
import { PaymentService } from '../services/payment.service.js';
import { sendResponse } from '../../../common/utils/responseEnvelope.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

export class PaymentController {
  constructor(private readonly service: PaymentService = new PaymentService()) {}

  recordPayment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const salesInvoiceId = req.params.invoiceId || req.body.salesInvoiceId;
      const amcContractId = req.params.contractId || req.body.amcContractId;

      const payload = {
        ...req.body,
        salesInvoiceId: salesInvoiceId || undefined,
        amcContractId: amcContractId || undefined,
        amount: Number(req.body.amount),
      };

      const result = await this.service.recordPayment(payload, userId);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.CREATED, result, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  };

  listPayments = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.service.listPayments({
        customerId: req.query.customerId as string,
        salesInvoiceId: req.params.invoiceId || (req.query.salesInvoiceId as string),
        proformaInvoiceId: req.query.proformaInvoiceId as string,
        salesOrderId: req.query.salesOrderId as string,
        amcContractId: req.params.contractId || (req.query.amcContractId as string),
        search: req.query.search as string,
        page,
        limit,
      });

      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result.data, 'Payments retrieved successfully', {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        totalAmountReceived: result.totalAmountReceived,
      });
    } catch (error) {
      next(error);
    }
  };

  getReceivablesSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.getReceivablesSummary();
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'Receivables summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  updateAmcPaymentStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;
      const contractId = req.params.id || req.params.contractId;
      const { paymentStatus, notes } = req.body;

      const result = await this.service.updateAmcPaymentStatus(contractId, paymentStatus, userId, notes);
      sendResponse(res, APP_CONSTANTS.HTTP_STATUS.OK, result, 'AMC Contract payment status updated successfully');
    } catch (error) {
      next(error);
    }
  };
}
