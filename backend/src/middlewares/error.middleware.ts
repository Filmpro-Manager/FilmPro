import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
}

export function errorMiddleware(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = err.statusCode || 500;
  const message = err.message || 'Erro interno do servidor';

  if (status === 500) {
    console.error('[500]', err);
  }

  res.status(status).json({ message });
}
