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

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      res.status(400).json({ message: 'E-mail é obrigatório' });
      return;
    }
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyResetCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ message: 'Código é obrigatório' });
      return;
    }
    const result = await authService.verifyResetCode(code);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body as { token?: string; password?: string };
    if (!token || !password) {
      res.status(400).json({ message: 'Token e nova senha são obrigatórios' });
      return;
    }
    const result = await authService.resetPassword(token, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
