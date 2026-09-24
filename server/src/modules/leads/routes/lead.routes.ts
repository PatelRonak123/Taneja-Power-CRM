import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate, requirePermission } from '../../../common/middleware/auth.middleware.js';
import {
  listLeadsSchema,
  getLeadByIdSchema,
  createLeadSchema,
  updateLeadSchema,
  deleteLeadSchema,
} from '../validators/lead.validator.js';

const router = Router();
const controller = new LeadController();

// All lead endpoints require authentication
router.use(authenticate);

router.get('/', validateRequest(listLeadsSchema), controller.list);
router.get('/pipeline', controller.getPipeline);
router.post('/', requirePermission('leads:create'), validateRequest(createLeadSchema), controller.create);
router.get('/:id', validateRequest(getLeadByIdSchema), controller.getById);
router.put('/:id', requirePermission('leads:edit_own'), validateRequest(updateLeadSchema), controller.update);
router.delete('/:id', requirePermission('leads:delete'), validateRequest(deleteLeadSchema), controller.delete);
router.post('/:id/activity', requirePermission('leads:edit_own'), controller.addActivity);

export default router;
