import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import * as appointmentController from '../controllers/appointment.controller';

const router = Router();

router.use(authMiddleware);

router.get('/',             appointmentController.getAll);
router.get('/:id',          appointmentController.getById);
router.post('/',            appointmentController.create);
router.put('/:id',          appointmentController.update);
router.patch('/:id/status', appointmentController.updateStatus);
router.post('/:id/convert-to-os', appointmentController.convertToServiceOrder);
router.delete('/:id',       appointmentController.remove);

export default router;
