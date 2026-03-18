import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as goalController from '../controllers/goal.controller';

const router = Router();
router.use(authMiddleware);

router.get('/',     goalController.getAll);
router.post('/',    goalController.create);
router.put('/:id',  goalController.update);
router.delete('/:id', goalController.remove);

export default router;
