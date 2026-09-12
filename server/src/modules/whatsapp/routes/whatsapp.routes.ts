import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';
import { authenticate, requireRoles } from '../../../common/middleware/auth.middleware.js';
import { APP_CONSTANTS } from '../../../config/constants.js';

const router = Router();
const controller = new WhatsAppController();

// All WhatsApp routes strictly require authentication and ADMIN role
router.use(authenticate, requireRoles(APP_CONSTANTS.ROLES.ADMIN));

// Endpoints
router.get('/status', controller.getStatus);
router.post('/connect', controller.connect);
router.post('/disconnect', controller.disconnect);
router.get('/events', controller.streamEvents);

export default router;
