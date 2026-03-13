import { Router } from 'express';
import * as storesController from '../controllers/stores.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', storesController.getAll);
router.get('/:id', storesController.getById);
router.post('/', storesController.create);
router.put('/:id', storesController.update);
router.patch('/:id/activate', storesController.activate);
router.patch('/:id/deactivate', storesController.deactivate);
router.delete('/:id', storesController.remove);

export default router;
