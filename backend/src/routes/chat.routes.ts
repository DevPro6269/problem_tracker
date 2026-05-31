import { Router } from 'express';
import validateBody from '../middleware/validateBody.js';
import { ChatSchema } from '../schemas/chat.schemas.js';
import { postChat } from '../controllers/chat.controller.js';

const router = Router({ mergeParams: true });

router.post('/', validateBody(ChatSchema), postChat);

export default router;
