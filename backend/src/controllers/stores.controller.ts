import { Request, Response, NextFunction } from 'express';
import * as storesService from '../services/stores.service';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.query.companyId as string | undefined;
    const stores = await storesService.getAll(companyId);
    res.json(stores);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await storesService.getById(req.params.id as string);
    if (!store) {
      res.status(404).json({ message: 'Loja não encontrada' });
      return;
    }
    res.json(store);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await storesService.create(req.body);
    res.status(201).json(store);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await storesService.update(req.params.id as string, req.body);
    res.json(store);
  } catch (error) {
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await storesService.activate(req.params.id as string);
    res.json(store);
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const store = await storesService.deactivate(req.params.id as string);
    res.json(store);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await storesService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
