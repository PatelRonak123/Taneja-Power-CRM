import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth.middleware.js';
import { searchLocationsHandler } from './geocoding.controller.js';

const router = Router();

// Protect geocoding API route with auth
router.use(authenticate);

router.get('/search', searchLocationsHandler);

export default router;
