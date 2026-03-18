import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import companiesRoutes from './companies.routes';
import storesRoutes from './stores.routes';
import masterRoutes from './master.routes';
import clientsRoutes from './clients.routes';
import inventoryRoutes from './inventory.routes';
import serviceCatalogRoutes from './service-catalog.routes';
import quoteRoutes from './quote.routes';
import serviceOrderRoutes from './service-order.routes';

const router = Router();

router.use('/master', masterRoutes);
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/companies', companiesRoutes);
router.use('/stores', storesRoutes);
router.use('/clients', clientsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/services', serviceCatalogRoutes);
router.use('/quotes', quoteRoutes);
router.use('/service-orders', serviceOrderRoutes);

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
