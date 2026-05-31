import { Router } from 'express';
import authGuard from '../middleware/authGuard.js';
import tenantGuard from '../middleware/tenantGuard.js';
import ticketRoutes from './ticket.routes.js';
import chatRoutes from './chat.routes.js';
import { getSociety } from '../controllers/society.controller.js';

const router = Router();

router.get('/:slug', authGuard, tenantGuard, getSociety);
router.use('/:slug/tickets', authGuard, tenantGuard, ticketRoutes);
router.use('/:slug/chat', authGuard, tenantGuard, chatRoutes);

export default router;
