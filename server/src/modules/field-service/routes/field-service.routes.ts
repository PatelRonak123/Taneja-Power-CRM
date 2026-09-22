import { Router } from 'express';
import { FieldServiceController } from '../controllers/field-service.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import {
  createFsrSchema,
  updateFsrSchema,
  getFsrByIdSchema,
  queryFsrSchema,
  assignFseSchema,
  updateSiteObservationRequestSchema,
  addBatteryBankRequestSchema,
  updateBatteryBankRequestSchema,
  deleteBatteryBankRequestSchema,
  addBatteryReadingRequestSchema,
  updateBatteryReadingRequestSchema,
  deleteBatteryReadingRequestSchema,
  addPartRequestSchema,
  updatePartRequestSchema,
  deletePartRequestSchema,
  customerSignOffRequestSchema,
  fseSignOffRequestSchema,
  uploadAttachmentRequestSchema,
  deleteAttachmentRequestSchema,
  cancelFsrSchema,
} from '../validators/field-service.validator.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const fsrController = new FieldServiceController();

// All FSR routes strictly require authentication
router.use(authenticate);

// 1. List & Create FSRs
router.get('/', validateRequest(queryFsrSchema), fsrController.list);
router.post('/', validateRequest(createFsrSchema), fsrController.create);

// 2. Lifecycle Actions
router.post('/:id/start', validateRequest(getFsrByIdSchema), fsrController.start);
router.post('/:id/complete', validateRequest(getFsrByIdSchema), fsrController.complete);
router.post(
  '/:id/assign',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(assignFseSchema),
  fsrController.assign
);
router.post(
  '/:id/close',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(getFsrByIdSchema),
  fsrController.close
);
router.post(
  '/:id/cancel',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(cancelFsrSchema),
  fsrController.cancel
);

// 3. Sign-off Endpoints
router.post('/:id/customer-signoff', validateRequest(customerSignOffRequestSchema), fsrController.customerSignOff);
router.post('/:id/fse-signoff', validateRequest(fseSignOffRequestSchema), fsrController.fseSignOff);

// 4. Site Observations Sub-Resource
router.put('/:id/site-observation', validateRequest(updateSiteObservationRequestSchema), fsrController.updateSiteObservation);

// 5. Battery Banks Sub-Resources
router.post('/:id/battery-banks', validateRequest(addBatteryBankRequestSchema), fsrController.addBatteryBank);
router.put('/:id/battery-banks/:bankId', validateRequest(updateBatteryBankRequestSchema), fsrController.updateBatteryBank);
router.delete('/:id/battery-banks/:bankId', validateRequest(deleteBatteryBankRequestSchema), fsrController.deleteBatteryBank);

// 6. Battery Readings Sub-Resources
router.post(
  '/:id/battery-banks/:bankId/readings',
  validateRequest(addBatteryReadingRequestSchema),
  fsrController.addBatteryReadings
);
router.put(
  '/:id/battery-banks/:bankId/readings/:readingId',
  validateRequest(updateBatteryReadingRequestSchema),
  fsrController.updateBatteryReading
);
router.delete(
  '/:id/battery-banks/:bankId/readings/:readingId',
  validateRequest(deleteBatteryReadingRequestSchema),
  fsrController.deleteBatteryReading
);

// 7. Parts Replacement Sub-Resources
router.post('/:id/parts', validateRequest(addPartRequestSchema), fsrController.addPart);
router.put('/:id/parts/:partId', validateRequest(updatePartRequestSchema), fsrController.updatePart);
router.delete('/:id/parts/:partId', validateRequest(deletePartRequestSchema), fsrController.deletePart);

// 8. Attachments Sub-Resources
router.post('/:id/attachments', validateRequest(uploadAttachmentRequestSchema), fsrController.uploadAttachment);
router.delete('/:id/attachments/:attachmentId', validateRequest(deleteAttachmentRequestSchema), fsrController.deleteAttachment);

// 9. Activity History Stream
router.get('/:id/activity', validateRequest(getFsrByIdSchema), fsrController.getActivityLogs);

// 10. Official FSR PDF Generation & Document Stream
router.get('/:id/pdf', validateRequest(getFsrByIdSchema), fsrController.getPdf);

// 11. Single FSR Read, Update & Delete
router.get('/:id', validateRequest(getFsrByIdSchema), fsrController.getById);
router.put('/:id', validateRequest(updateFsrSchema), fsrController.update);
router.patch('/:id', validateRequest(updateFsrSchema), fsrController.update);
router.delete(
  '/:id',
  requireRoles(APP_CONSTANTS.ROLES.ADMIN, APP_CONSTANTS.ROLES.MANAGER),
  validateRequest(getFsrByIdSchema),
  fsrController.delete
);

export default router;
