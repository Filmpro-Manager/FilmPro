import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as transactionController from '../controllers/transaction.controller';

const router = Router();
router.use(authMiddleware);

router.get('/',     transactionController.getAll);
router.post('/',    transactionController.create);
router.put('/:id',  transactionController.update);
router.delete('/:id', transactionController.remove);

export default router;
