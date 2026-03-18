import { Router } from 'express';
import * as quoteController from '../controllers/quote.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', quoteController.getAll);
router.get('/:id', quoteController.getById);
router.post('/', quoteController.create);
router.put('/:id', quoteController.update);
router.patch('/:id/status', quoteController.updateStatus);
router.patch('/:id/convert', quoteController.convert);
router.delete('/:id', quoteController.remove);

export default router;
