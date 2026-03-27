import { Request, Response, NextFunction } from 'express';
import * as subscriptionService from '../services/subscription.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

export async function getInfo(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    if (!user.companyId) {
      res.status(403).json({ message: 'Usuário sem empresa associada' });
      return;
    }
    const info = await subscriptionService.getSubscriptionInfo(user.companyId);
    res.json(info);
  } catch (error) {
    next(error);
  }
}

export async function createCharge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = (req as AuthRequest).user;
    if (!user.companyId) {
      res.status(403).json({ message: 'Usuário sem empresa associada' });
      return;
    }
    const charge = await subscriptionService.createCharge(user.companyId);
    res.status(201).json(charge);
  } catch (error) {
    next(error);
  }
}

/**
 * Endpoint público — chamado pela OpenPix quando um pagamento é confirmado.
 */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = (req.headers['x-webhook-signature'] as string) ?? '';
    const rawBody = JSON.stringify(req.body);

    if (!subscriptionService.verifyWebhookSignature(rawBody, signature)) {
      res.status(401).json({ message: 'Assinatura inválida' });
      return;
    }

    const result = await subscriptionService.handleWebhook(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
