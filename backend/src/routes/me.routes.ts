import { Router } from 'express';
import authGuard from '../middleware/authGuard.js';
import { getMe } from '../controllers/me.controller.js';

const router = Router();
router.get('/', authGuard, getMe);

export default router;
