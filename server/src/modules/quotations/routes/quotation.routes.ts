import { Router } from 'express';
import { QuotationController } from '../controllers/quotation.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  createQuotationSchema,
  updateQuotationSchema,
  createRevisionSchema,
  submitQuotationSchema,
  approveQuotationSchema,
  rejectQuotationSchema,
  withdrawQuotationSchema,
  listQuotationsSchema,
  getQuotationByIdSchema,
  getRevisionByNumberSchema,
} from '../validators/quotation.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const quotationController = new QuotationController();

// All quotation endpoints require authentication
router.use(authenticate);

// 1. List & Create Quotations
router.get('/', validateRequest(listQuotationsSchema), quotationController.list);
router.post('/', validateRequest(createQuotationSchema), quotationController.create);

// 2. Revision Management
router.get('/:id/revisions', validateRequest(getQuotationByIdSchema), quotationController.getRevisions);
router.get(
  '/:id/revisions/:revisionNumber',
  validateRequest(getRevisionByNumberSchema),
  quotationController.getRevisionByNumber
);
router.post('/:id/revisions', validateRequest(createRevisionSchema), quotationController.createRevision);

// 3. Approval Workflow Lifecycle
router.post('/:id/submit', validateRequest(submitQuotationSchema), quotationController.submit);
router.post(
  '/:id/approve',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(approveQuotationSchema),
  quotationController.approve
);
router.post(
  '/:id/reject',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(rejectQuotationSchema),
  quotationController.reject
);
router.post('/:id/withdraw', validateRequest(withdrawQuotationSchema), quotationController.withdraw);

// 4. Audit & History Streams
router.get('/:id/approvals', validateRequest(getQuotationByIdSchema), quotationController.getApprovals);
router.get('/:id/activity', validateRequest(getQuotationByIdSchema), quotationController.getActivity);

// 5. PDF Generation & Document Streaming
router.get('/:id/pdf', validateRequest(getQuotationByIdSchema), quotationController.getPdf);
router.get(
  '/:id/revisions/:revisionNumber/pdf',
  validateRequest(getRevisionByNumberSchema),
  quotationController.getRevisionPdf
);

// 6. Single Quotation Read & Update
router.get('/:id', validateRequest(getQuotationByIdSchema), quotationController.getById);
router.put('/:id', validateRequest(updateQuotationSchema), quotationController.update);

export default router;
