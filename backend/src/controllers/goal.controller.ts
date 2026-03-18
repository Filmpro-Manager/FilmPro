import { Request, Response, NextFunction } from 'express';
import * as goalService from '../services/goal.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    res.json(await goalService.getAllByStore(storeId));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { type, period, target } = req.body as { type?: string; period?: string; target?: number };
    if (!type)            { res.status(400).json({ message: 'Tipo é obrigatório' }); return; }
    if (!period)          { res.status(400).json({ message: 'Período é obrigatório (YYYY-MM)' }); return; }
    if (target === undefined) { res.status(400).json({ message: 'Meta (target) é obrigatória' }); return; }

    const goal = await goalService.create({ ...req.body, storeId });
    res.status(201).json(goal);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    res.json(await goalService.update(req.params.id as string, storeId, req.body));
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    await goalService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
