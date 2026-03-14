import { Request, Response, NextFunction } from 'express';
import * as clientsService from '../services/clients.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

// ─── CLIENTS ───────────────────────────────────────────────────────────────

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const clients = await clientsService.getAllByStore(storeId);
    res.json(clients);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const client = await clientsService.getById(req.params.id as string, storeId);
    if (!client) { res.status(404).json({ message: 'Cliente não encontrado' }); return; }

    res.json(client);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const client = await clientsService.create({ ...req.body, storeId });
    res.status(201).json(client);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const client = await clientsService.update(req.params.id as string, storeId, req.body);
    res.json(client);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await clientsService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ─── VEHICLES ──────────────────────────────────────────────────────────────

export async function createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const vehicle = await clientsService.createVehicle({
      ...req.body,
      clientId: req.params.id,
      storeId,
    });
    res.status(201).json(vehicle);
  } catch (error) {
    next(error);
  }
}

export async function updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const vehicle = await clientsService.updateVehicle(req.params.vehicleId as string, storeId, req.body);
    res.json(vehicle);
  } catch (error) {
    next(error);
  }
}

export async function removeVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await clientsService.removeVehicle(req.params.vehicleId as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
