import { Request, Response, NextFunction } from 'express';
import * as companiesService from '../services/companies.service';

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const companies = await companiesService.getAll();
    res.json(companies);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await companiesService.getById(req.params.id as string);
    if (!company) {
      res.status(404).json({ message: 'Empresa não encontrada' });
      return;
    }
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await companiesService.create(req.body);
    res.status(201).json(company);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await companiesService.update(req.params.id as string, req.body);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await companiesService.activate(req.params.id as string);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const company = await companiesService.deactivate(req.params.id as string);
    res.json(company);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await companiesService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
