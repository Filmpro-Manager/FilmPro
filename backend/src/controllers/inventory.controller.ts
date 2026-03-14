import { Request, Response, NextFunction } from 'express';
import * as inventoryService from '../services/inventory.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

function getUserId(req: Request): string | null {
  return (req as AuthRequest).user?.id ?? null;
}

// ─── ITEMS ──────────────────────────────────────────────────────────────────

export async function getItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const items = await inventoryService.getAllItems(storeId);
    res.json(items);
  } catch (error) {
    next(error);
  }
}

export async function getItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const item = await inventoryService.getItemById(req.params.id as string, storeId);
    if (!item) { res.status(404).json({ message: 'Item não encontrado' }); return; }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function createItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    const userId = getUserId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    if (!userId) { res.status(403).json({ message: 'Usuário não identificado' }); return; }

    const item = await inventoryService.createItem({ ...req.body, storeId, userId });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await inventoryService.updateItem(req.params.id as string, storeId, req.body);
    const updated = await inventoryService.getItemById(req.params.id as string, storeId);
    if (!updated) { res.status(404).json({ message: 'Item não encontrado' }); return; }

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await inventoryService.deleteItem(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// ─── MOVEMENTS ───────────────────────────────────────────────────────────────

export async function getMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const itemId = req.query.itemId as string | undefined;
    const movements = await inventoryService.getAllMovements(storeId, itemId);
    res.json(movements);
  } catch (error) {
    next(error);
  }
}

export async function createMovement(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    const userId = getUserId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    if (!userId) { res.status(403).json({ message: 'Usuário não identificado' }); return; }

    const movement = await inventoryService.createMovement({
      ...req.body,
      storeId,
      userId,
    });
    res.status(201).json(movement);
  } catch (error) {
    next(error);
  }
}
