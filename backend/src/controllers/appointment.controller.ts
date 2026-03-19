import { Request, Response, NextFunction } from 'express';
import * as appointmentService from '../services/appointment.service';
import { JwtPayload } from '../utils/jwt';

type AuthRequest = Request & { user: JwtPayload };

function getStoreId(req: Request): string | null {
  return (req as AuthRequest).user?.storeId ?? null;
}

export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const appointments = await appointmentService.getAllByStore(storeId);
    res.json(appointments);
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const appointment = await appointmentService.getById(req.params.id as string, storeId);
    if (!appointment) { res.status(404).json({ message: 'Agendamento não encontrado' }); return; }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const { date, clientName } = req.body as { date?: string; clientName?: string };
    if (!date)       { res.status(400).json({ message: 'Data do agendamento é obrigatória' }); return; }
    if (!clientName) { res.status(400).json({ message: 'Nome do cliente é obrigatório' }); return; }

    const user = (req as AuthRequest).user;
    const appointment = await appointmentService.create({
      ...req.body,
      storeId,
      createdById: user.id,
      createdByName: user.name,
    });
    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const appointment = await appointmentService.update(req.params.id as string, storeId, req.body);
    res.json(appointment);
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

    const appointment = await appointmentService.updateStatus(req.params.id as string, storeId, status);
    res.json(appointment);
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    await appointmentService.remove(req.params.id as string, storeId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function convertToServiceOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const storeId = getStoreId(req);
    if (!storeId) { res.status(403).json({ message: 'Loja não identificada' }); return; }

    const user = (req as AuthRequest).user;
    const so = await appointmentService.convertToServiceOrder(
      req.params.id as string,
      storeId,
      user.id,
      user.name,
    );
    res.status(201).json(so);
  } catch (error) {
    next(error);
  }
}
