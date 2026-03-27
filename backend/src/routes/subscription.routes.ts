import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as subscriptionController from '../controllers/subscription.controller';

const router = Router();

// Webhook público — OpenPix chama este endpoint
router.post('/webhook', subscriptionController.webhook);

// Rotas protegidas (apenas usuários autenticados com empresa)
router.get('/info', authMiddleware, subscriptionController.getInfo);
router.post('/charge', authMiddleware, subscriptionController.createCharge);

export default router;
