import { Request, Response, NextFunction } from 'express';
import * as quoteService from '../services/quote.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const createdById = req.query.createdById as string | undefined;
    const quotes = await quoteService.getAllByStore(storeId, createdById);
    res.json(quotes);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const quote = await quoteService.getById(req.params.id as string, storeId);
    if (!quote) { res.status(404).json({ message: 'Orçamento não encontrado' }); return; }

    res.json(quote);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const user = (req as AuthRequest).user;
    const quote = await quoteService.create({
      ...req.body,
      storeId,
      createdById: user.id,
      createdByName: user.name,
    });
    res.status(201).json(quote);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const quote = await quoteService.update(req.params.id as string, storeId, req.body);
    res.json(quote);
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

    const quote = await quoteService.updateStatus(req.params.id as string, storeId, status);
    res.json(quote);
  } catch (error) {
    next(error);
  }
}

export async function convert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { appointmentId } = req.body as { appointmentId: string };
    if (!appointmentId) { res.status(400).json({ message: 'appointmentId é obrigatório' }); return; }

    const quote = await quoteService.convertToAppointment(req.params.id as string, storeId, appointmentId);
    res.json(quote);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await quoteService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
