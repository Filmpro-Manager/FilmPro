import { Request, Response, NextFunction } from 'express';
import * as serviceOrderService from '../services/service-order.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const orders = await serviceOrderService.getAllByStore(storeId);
    res.json(orders);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const order = await serviceOrderService.getById(req.params.id as string, storeId);
    if (!order) { res.status(404).json({ message: 'Ordem de Serviço não encontrada' }); return; }

    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { date, clientName } = req.body as { date?: string; clientName?: string };
    if (!date)        { res.status(400).json({ message: 'Data do serviço é obrigatória' }); return; }
    if (!clientName)  { res.status(400).json({ message: 'Nome do cliente é obrigatório' }); return; }

    const user = (req as AuthRequest).user;
    const order = await serviceOrderService.create({
      ...req.body,
      storeId,
      createdById: user.id,
      createdByName: user.name,
    });
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const order = await serviceOrderService.update(req.params.id as string, storeId, req.body);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { status } = req.body as { status: string };
    if (!status) { res.status(400).json({ message: 'Status é obrigatório' }); return; }

    const order = await serviceOrderService.updateStatus(req.params.id as string, storeId, status);
    res.json(order);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await serviceOrderService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
