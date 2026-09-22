import { Router } from 'express';
import { LeadController } from '../controllers/lead.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate } from '../../../common/middleware/auth.middleware.js';
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
router.post('/', validateRequest(createLeadSchema), controller.create);
router.get('/:id', validateRequest(getLeadByIdSchema), controller.getById);
router.put('/:id', validateRequest(updateLeadSchema), controller.update);
router.delete('/:id', validateRequest(deleteLeadSchema), controller.delete);
router.post('/:id/activity', controller.addActivity);

export default router;
