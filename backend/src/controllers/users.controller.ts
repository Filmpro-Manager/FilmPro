import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await usersService.getAll();
    res.json(users);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.getById(req.params.id as string);
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requester = (req as AuthRequest).user;

    // Owner só pode criar usuários vinculados a uma loja
    if (requester.role === 'owner' && !req.body.storeId) {
      res.status(400).json({ message: 'storeId é obrigatório: o dono só pode criar usuários dentro de uma loja' });
      return;
    }

    const user = await usersService.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.update(req.params.id as string, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function activate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.activate(req.params.id as string);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await usersService.deactivate(req.params.id as string);
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await usersService.remove(req.params.id as string);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
