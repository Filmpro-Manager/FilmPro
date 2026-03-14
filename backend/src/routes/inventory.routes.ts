import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as inventoryController from '../controllers/inventory.controller';

const router = Router();

router.use(authMiddleware);

// Items
router.get('/items', inventoryController.getItems);
router.get('/items/:id', inventoryController.getItem);
router.post('/items', inventoryController.createItem);
router.put('/items/:id', inventoryController.updateItem);
router.delete('/items/:id', inventoryController.deleteItem);

// Movements
router.get('/movements', inventoryController.getMovements);
router.post('/movements', inventoryController.createMovement);

export default router;
