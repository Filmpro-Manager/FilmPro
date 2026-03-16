import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/me', usersController.getProfile);
router.put('/me', usersController.updateProfile);

router.get('/', usersController.getAll);
router.get('/:id', usersController.getById);
router.post('/', usersController.create);
router.put('/:id', usersController.update);
router.patch('/:id/activate', usersController.activate);
router.patch('/:id/deactivate', usersController.deactivate);
router.delete('/:id', usersController.remove);

export default router;
