import { Router } from 'express';
import * as clientsController from '../controllers/clients.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

// Clients
router.get('/', clientsController.getAll);
router.get('/:id', clientsController.getById);
router.post('/', clientsController.create);
router.put('/:id', clientsController.update);
router.delete('/:id', clientsController.remove);

// Vehicles (nested under client)
router.post('/:id/vehicles', clientsController.createVehicle);
router.put('/:id/vehicles/:vehicleId', clientsController.updateVehicle);
router.delete('/:id/vehicles/:vehicleId', clientsController.removeVehicle);

export default router;
