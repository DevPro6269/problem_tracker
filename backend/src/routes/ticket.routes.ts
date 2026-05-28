import { Router } from 'express';
import requireRole from '../middleware/requireRole.js';
import validateBody from '../middleware/validateBody.js';
import { CreateTicketSchema, UpdateTicketSchema } from '../schemas/ticket.schemas.js';
import { create, listAll, listMine, getOne, update } from '../controllers/ticket.controller.js';

// mergeParams lets nested routes read :slug from the parent router
const router = Router({ mergeParams: true });

router.get('/mine', requireRole('RESIDENT'), listMine);
router.get('/', requireRole('ADMIN'), listAll);
router.get('/:id', getOne);
router.post('/', requireRole('RESIDENT'), validateBody(CreateTicketSchema), create);
router.patch('/:id', requireRole('ADMIN'), validateBody(UpdateTicketSchema), update);

export default router;
