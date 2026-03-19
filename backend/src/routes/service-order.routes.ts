import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as serviceOrderController from '../controllers/service-order.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',       serviceOrderController.getAll);
router.get('/:id',    serviceOrderController.getById);
router.post('/',      serviceOrderController.create);
router.put('/:id',    serviceOrderController.update);
router.patch('/:id/status', serviceOrderController.updateStatus);
router.post('/:id/complete', serviceOrderController.completeWithPayment);
router.delete('/:id', serviceOrderController.remove);

export default router;
