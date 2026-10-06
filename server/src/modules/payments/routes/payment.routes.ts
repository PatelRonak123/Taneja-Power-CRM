import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate, requireAccountantOrAdminOrManager } from '../../../common/middleware/auth.middleware.js';

const router = Router();
const controller = new PaymentController();

// 1. Receivables Summary (grouped by customer) - Read access
router.get('/receivables-summary', authenticate, controller.getReceivablesSummary);

// 2. List all payments with filtering - Read access
router.get('/', authenticate, controller.listPayments);

// 3. Record a new payment - Admin / Accountant Office only
router.post('/', authenticate, requireAccountantOrAdminOrManager, controller.recordPayment);

// 4. Update AMC Contract payment status directly - Admin / Accountant Office only
router.put('/amc-contracts/:contractId/status', authenticate, requireAccountantOrAdminOrManager, controller.updateAmcPaymentStatus);

// 5. Payments for a specific invoice
router.get('/invoices/:invoiceId', authenticate, controller.listPayments);
router.post('/invoices/:invoiceId', authenticate, requireAccountantOrAdminOrManager, controller.recordPayment);

// 6. Payments for a specific AMC contract
router.get('/amc-contracts/:contractId', authenticate, controller.listPayments);
router.post('/amc-contracts/:contractId', authenticate, requireAccountantOrAdminOrManager, controller.recordPayment);

export default router;
