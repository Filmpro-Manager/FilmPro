import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as serviceCatalogController from '../controllers/service-catalog.controller';

const router = Router();

router.use(authMiddleware);

router.get('/', serviceCatalogController.getServices);
router.post('/', serviceCatalogController.createService);
router.put('/:id', serviceCatalogController.updateService);
router.patch('/:id/toggle', serviceCatalogController.toggleActiveService);
router.delete('/:id', serviceCatalogController.deleteService);

export default router;
