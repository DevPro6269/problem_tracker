import { Router } from 'express';
import authGuard from '../middleware/authGuard.js';
import tenantGuard from '../middleware/tenantGuard.js';
import ticketRoutes from './ticket.routes.js';

const router = Router();

router.use('/:slug/tickets', authGuard, tenantGuard, ticketRoutes);

export default router;
