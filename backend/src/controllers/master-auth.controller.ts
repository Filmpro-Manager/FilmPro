import { Request, Response, NextFunction } from 'express';
import { masterLogin } from '../services/master-auth.service';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await masterLogin(email, password);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
