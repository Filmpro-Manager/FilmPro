import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/login', authController.login);
router.post('/select-store', authMiddleware, authController.selectStore);

export default router;
