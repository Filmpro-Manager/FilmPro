import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { generateToken } from '../utils/jwt';
import { sendPasswordResetEmail } from '../utils/email';

interface LoginInput {
  email: string;
  password: string;
}

export async function selectStore(userId: string, storeId: string, companyId: string) {
  const store = await prisma.store.findFirst({
    where: { id: storeId, companyId },
  });

  if (!store) {
    throw Object.assign(new Error('Loja não encontrada ou sem acesso'), { statusCode: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 });
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    storeId,
  });

  return { token };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    storeId: user.storeId ?? null,
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      storeId: user.storeId ?? null,
      avatarUrl: (user as unknown as { avatarUrl?: string | null }).avatarUrl ?? null,
    },
  };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Resposta genérica para não revelar se o e-mail existe
    return { message: 'Se esse e-mail estiver cadastrado, você receberá as instruções.' };
  }

  // Código de 6 dígitos, gerado de forma criptograficamente segura
  const code = crypto.randomInt(100000, 999999).toString();
  const expiry = new Date(Date.now() + 60 * 1000); // 1 minuto

  await (prisma.user.update as any)({
    where: { id: user.id },
    data: { passwordResetToken: code, passwordResetExpiry: expiry },
  });

  await sendPasswordResetEmail(user.email, user.name, code);

  return { message: 'Se esse e-mail estiver cadastrado, você receberá as instruções.' };
}

export async function verifyResetCode(code: string) {
  const user = await (prisma.user.findFirst as any)({
    where: {
      passwordResetToken: code,
      passwordResetExpiry: { gt: new Date() },
    },
  });

  if (!user) {
    throw Object.assign(new Error('Código inválido ou expirado'), { statusCode: 400 });
  }

  return { valid: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await (prisma.user.findFirst as any)({
    where: {
      passwordResetToken: token,
      passwordResetExpiry: { gt: new Date() },
    },
  }) as Awaited<ReturnType<typeof prisma.user.findFirst>>;

  if (!user) {
    throw Object.assign(new Error('Token inválido ou expirado'), { statusCode: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma.user.update as any)({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiry: null,
    },
  });

  return { message: 'Senha redefinida com sucesso.' };
}
