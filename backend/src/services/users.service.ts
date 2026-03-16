import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { handlePrismaError } from '../utils/prisma-error';

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  avatarUrl: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
  store: { select: { id: true, name: true } },
} as const;

interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  companyId: string;
  storeId?: string | null;
  role?: string;
}

interface UpdateUserInput {
  name?: string;
  phone?: string;
  role?: string;
  status?: string;
  storeId?: string | null;
}

export async function getAll() {
  return prisma.user.findMany({ select: userSelect });
}

export async function getById(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

export async function create(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Email já cadastrado'), { statusCode: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        phone: input.phone,
        companyId: input.companyId,
        storeId: input.storeId ?? null,
        role: input.role ?? 'employee',
      },
      select: userSelect,
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário', field: 'companyId' });
  }
}

export async function update(id: string, data: UpdateUserInput) {
  const updateData: UpdateUserInput = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.storeId !== undefined) updateData.storeId = data.storeId ?? null;

  try {
    return await prisma.user.update({ where: { id }, data: updateData, select: userSelect });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário' });
  }
}

export async function activate(id: string) {
  try {
    return await prisma.user.update({ where: { id }, data: { status: 'active' }, select: userSelect });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário' });
  }
}

export async function deactivate(id: string) {
  try {
    return await prisma.user.update({ where: { id }, data: { status: 'inactive' }, select: userSelect });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário' });
  }
}

export async function remove(id: string) {
  try {
    return await prisma.user.delete({ where: { id } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário' });
  }
}

// ─── Perfil do próprio usuário ────────────────────────────────────────────────

export async function getProfile(id: string) {
  return prisma.user.findUnique({ where: { id }, select: userSelect });
}

interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarUrl?: string | null;
  currentPassword?: string;
  newPassword?: string;
}

export async function updateProfile(id: string, data: UpdateProfileInput) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
  }

  // Se quer trocar senha, valida a atual
  let passwordHash: string | undefined;
  if (data.newPassword) {
    if (!data.currentPassword) {
      throw Object.assign(new Error('Senha atual é obrigatória para alterar a senha'), { statusCode: 400 });
    }
    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      throw Object.assign(new Error('Senha atual incorreta'), { statusCode: 400 });
    }
    passwordHash = await bcrypt.hash(data.newPassword, 10);
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
  if (passwordHash) updateData.passwordHash = passwordHash;

  try {
    return await prisma.user.update({ where: { id }, data: updateData, select: userSelect });
  } catch (e) {
    handlePrismaError(e, { entity: 'Usuário' });
  }
}
