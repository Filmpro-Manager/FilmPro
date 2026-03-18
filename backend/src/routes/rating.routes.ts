import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as ratingController from '../controllers/rating.controller';

const router = Router();
router.use(authMiddleware);

router.get('/',     ratingController.getAll);
router.post('/',    ratingController.create);
router.delete('/:id', ratingController.remove);

export default router;
