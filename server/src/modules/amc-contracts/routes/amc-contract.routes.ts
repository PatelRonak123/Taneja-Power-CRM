import { Router } from 'express';
import { AmcContractController } from '../controllers/amc-contract.controller.js';
import { authenticate, requireRoles, denyDesignations } from '../../../common/middleware/auth.middleware.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new AmcContractController();

// Require authentication for all AMC Contract endpoints
router.use(authenticate);

router.get('/', controller.getContracts);
router.post('/from-quotation/:quotationId', denyDesignations('Accountant Office'), controller.createFromQuotation);
router.get('/:id', controller.getContractById);
router.put('/:id', denyDesignations('Accountant Office'), controller.updateContract);
router.post(
  '/:id/activate',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  controller.activateContract
);
router.post(
  '/:id/terminate',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  controller.terminateContract
);
router.post('/:id/service-requests', denyDesignations('Accountant Office'), controller.createBreakdownRequest);
router.post('/:id/service-requests/:requestId/escalate', denyDesignations('Accountant Office'), controller.escalateBreakdownRequest);
router.get('/:id/service-requests/:requestId', controller.getBreakdownRequestById);
router.post('/schedule/:visitId/create-task', denyDesignations('Accountant Office'), controller.createTaskForVisit);

// Phase 7: Renewal & History
router.post(
  '/:id/renew',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  controller.renewContract
);
router.get('/:id/history', controller.getContractHistory);

// Phase 5 Service Execution & Report Routes
router.post('/visits/:visitId/start', denyDesignations('Accountant Office'), controller.startVisit);
router.post('/visits/:visitId/cancel', denyDesignations('Accountant Office'), controller.cancelVisit);
router.get('/visits/:visitId/report', controller.getOrCreateServiceReport);
router.post('/visits/:visitId/report', denyDesignations('Accountant Office'), controller.updateServiceReport);
router.post('/visits/:visitId/complete', denyDesignations('Accountant Office'), controller.completeServiceVisit);
router.get('/reports/:reportId/pdf', controller.downloadServiceReportPdf);

// Phase 6 Materials Routes
router.get('/reports/:reportId/materials', controller.getMaterialsForReport);

export default router;
