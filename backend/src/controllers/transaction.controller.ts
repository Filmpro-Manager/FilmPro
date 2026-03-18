import { Request, Response, NextFunction } from 'express';
import * as transactionService from '../services/transaction.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    res.json(await transactionService.getAllByStore(storeId));
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { type, description, amount, date, category } = req.body as {
      type?: string; description?: string; amount?: number; date?: string; category?: string;
    };
    if (!type)        { res.status(400).json({ message: 'Tipo é obrigatório (income | expense)' }); return; }
    if (!description) { res.status(400).json({ message: 'Descrição é obrigatória' }); return; }
    if (amount === undefined) { res.status(400).json({ message: 'Valor é obrigatório' }); return; }
    if (!date)        { res.status(400).json({ message: 'Data é obrigatória' }); return; }
    if (!category)    { res.status(400).json({ message: 'Categoria é obrigatória' }); return; }

    const user = (req as AuthRequest).user;
    const tx = await transactionService.create({
      ...req.body,
      storeId,
      createdById: user.id,
      createdByName: user.name,
    });
    res.status(201).json(tx);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    res.json(await transactionService.update(req.params.id as string, storeId, req.body));
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }
    await transactionService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
