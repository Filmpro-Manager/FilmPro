import prisma from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt';

interface LoginInput {
  email: string;
  password: string;
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
    },
  };
}
