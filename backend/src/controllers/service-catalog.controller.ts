import { Request, Response, NextFunction } from 'express';
import * as serviceCatalogService from '../services/service-catalog.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const onlyActive = req.query.active === 'true';
    const services = await serviceCatalogService.findAll(storeId, onlyActive);
    res.json(services);
  } catch (error) {
    next(error);
  }
}

export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { name, description, category, price, estimatedMinutes, isActive } = req.body;
    if (!name || !category || price == null) {
      res.status(400).json({ message: 'Nome, categoria e valor são obrigatórios' });
      return;
    }

    const service = await serviceCatalogService.create({
      storeId,
      name,
      description,
      category,
      price: Number(price),
      estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
      isActive,
    });
    res.status(201).json(service);
  } catch (error) {
    next(error);
  }
}

export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const service = await serviceCatalogService.update(req.params.id as string, storeId, req.body);
    if (!service) { res.status(404).json({ message: 'Serviço não encontrado' }); return; }

    res.json(service);
  } catch (error) {
    next(error);
  }
}

export async function toggleActiveService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const service = await serviceCatalogService.toggleActive(req.params.id as string, storeId);
    if (!service) { res.status(404).json({ message: 'Serviço não encontrado' }); return; }

    res.json(service);
  } catch (error) {
    next(error);
  }
}

export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await serviceCatalogService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
