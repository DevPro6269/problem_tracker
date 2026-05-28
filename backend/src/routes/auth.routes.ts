import { Router } from 'express';
import validateBody from '../middleware/validateBody.js';
import {
  SendOtpSchema,
  LoginSchema,
  RegisterAdminSchema,
  RegisterResidentSchema,
} from '../schemas/auth.schemas.js';
import {
  sendOtp,
  login,
  registerAdminController,
  registerResidentController,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/send-otp', validateBody(SendOtpSchema), sendOtp);
router.post('/login', validateBody(LoginSchema), login);
router.post('/register-admin', validateBody(RegisterAdminSchema), registerAdminController);
router.post('/register-resident', validateBody(RegisterResidentSchema), registerResidentController);

export default router;
