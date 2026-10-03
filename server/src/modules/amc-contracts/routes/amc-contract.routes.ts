import { Router } from 'express';
import { AmcContractController } from '../controllers/amc-contract.controller.js';
import { authenticate, requireRoles, denyDesignations } from '../../../common/middleware/auth.middleware.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new AmcContractController();

// Require authentication for all AMC Contract endpoints
router.use(authenticate);

// Sales Office & Accountant Office have no access to AMC Contracts (handled by Service Office, Admin, Manager)
const denyNonServiceOffice = denyDesignations('Accountant Office', 'Sales Office', 'Sales');

router.get('/', denyNonServiceOffice, controller.getContracts);
router.post('/from-quotation/:quotationId', denyNonServiceOffice, controller.createFromQuotation);
router.get('/:id', denyNonServiceOffice, controller.getContractById);
router.put('/:id', denyNonServiceOffice, controller.updateContract);
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
router.post('/:id/service-requests', denyNonServiceOffice, controller.createBreakdownRequest);
router.post('/:id/service-requests/:requestId/escalate', denyNonServiceOffice, controller.escalateBreakdownRequest);
router.get('/:id/service-requests/:requestId', denyNonServiceOffice, controller.getBreakdownRequestById);
router.post('/:id/service-requests/:requestId/coverage', denyNonServiceOffice, controller.setCoverageDecision);
router.post('/:id/service-requests/:requestId/create-repair-task', denyNonServiceOffice, controller.createRepairTaskForRequest);
router.post('/:id/service-requests/:requestId/link-quotation', denyNonServiceOffice, controller.linkQuotationToRequest);
router.post('/:id/service-requests/:requestId/link-sales-order', denyNonServiceOffice, controller.linkSalesOrderToRequest);
router.post('/schedule/:visitId/create-task', denyNonServiceOffice, controller.createTaskForVisit);

// Phase 7: Renewal & History
router.post(
  '/:id/renew',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  controller.renewContract
);
router.get('/:id/history', denyNonServiceOffice, controller.getContractHistory);

// Phase 5 Service Execution & Report Routes
router.post('/visits/:visitId/start', denyNonServiceOffice, controller.startVisit);
router.post('/visits/:visitId/cancel', denyNonServiceOffice, controller.cancelVisit);
router.get('/visits/:visitId/report', denyNonServiceOffice, controller.getOrCreateServiceReport);
router.post('/visits/:visitId/report', denyNonServiceOffice, controller.updateServiceReport);
router.post('/visits/:visitId/complete', denyNonServiceOffice, controller.completeServiceVisit);
router.get('/reports/:reportId/pdf', denyNonServiceOffice, controller.downloadServiceReportPdf);

// Phase 6 Materials Routes
router.get('/reports/:reportId/materials', denyNonServiceOffice, controller.getMaterialsForReport);

export default router;
