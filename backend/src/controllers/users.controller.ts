import { Request, Response, NextFunction } from 'express';
import * as usersService from '../services/users.service';
import { JwtPayload } from '../utils/jwt';
import { generateRandomPassword, sendWelcomeEmail } from '../utils/email';

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

    const { name, email, phone, role } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
    };

    if (!name || !email || !phone) {
      res.status(400).json({ message: 'Campos obrigatórios: name, email, phone' });
      return;
    }

    // Owner só pode criar manager ou employee — nunca outro owner
    const allowedRoles = ['manager', 'employee'];
    const targetRole = (role ?? 'employee').toLowerCase();
    if (requester.role === 'owner' && !allowedRoles.includes(targetRole)) {
      res.status(403).json({ message: 'Você só pode criar usuários com perfil de Administrador ou Técnico' });
      return;
    }

    // companyId e storeId sempre herdados do criador (segurança)
    const companyId = requester.companyId;
    const storeId = requester.storeId;

    if (!companyId) {
      res.status(400).json({ message: 'Usuário autenticado não possui empresa associada' });
      return;
    }

    // Gera senha aleatória — nunca exposta na resposta
    const tempPassword = generateRandomPassword();

    const user = await usersService.create({
      name,
      email,
      password: tempPassword,
      phone,
      role: targetRole,
      companyId,
      storeId,
    });

    // Envia e-mail com credenciais em background (não bloqueia resposta)
    sendWelcomeEmail(email, name, tempPassword).catch((err) => {
      console.error('[sendWelcomeEmail] Falha ao enviar e-mail de boas-vindas:', err);
    });

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

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = (req as AuthRequest).user;
    const user = await usersService.getProfile(id);
    if (!user) {
      res.status(404).json({ message: 'Usuário não encontrado' });
      return;
    }
    res.json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = (req as AuthRequest).user;
    const user = await usersService.updateProfile(id, req.body);
    res.json(user);
  } catch (error) {
    next(error);
  }
}
