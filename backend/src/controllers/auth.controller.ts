import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function selectStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    const { storeId } = req.body as { storeId?: string };

    if (!storeId) {
      res.status(400).json({ message: 'storeId é obrigatório' });
      return;
    }

    if (!user.companyId) {
      res.status(403).json({ message: 'Usuário sem empresa associada' });
      return;
    }

    const result = await authService.selectStore(user.id, storeId, user.companyId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
