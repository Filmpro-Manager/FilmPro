import { Router } from 'express';
import * as companiesController from '../controllers/companies.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/', companiesController.create);

router.get('/', companiesController.getAll);
router.get('/:id', companiesController.getById);
router.put('/:id', companiesController.update);
router.patch('/:id/activate', companiesController.activate);
router.patch('/:id/deactivate', companiesController.deactivate);
router.delete('/:id', companiesController.remove);

export default router;
