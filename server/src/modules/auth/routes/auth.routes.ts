import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { validateRequest } from '../../../common/middleware/validate.middleware.js';
import { authenticate } from '../../../common/middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';

const router = Router();
const controller = new AuthController();

router.post('/register', validateRequest(registerSchema), controller.register);
router.post('/login', validateRequest(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), controller.forgotPassword);
router.post('/verify-otp', validateRequest(verifyOtpSchema), controller.verifyOtp);
router.post('/reset-password', validateRequest(resetPasswordSchema), controller.resetPassword);
router.get('/me', authenticate, controller.me);

export default router;
