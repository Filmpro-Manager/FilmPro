import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { generateToken } from '../utils/jwt';

export async function masterLogin(email: string, password: string) {
  const master = await prisma.masterUser.findUnique({ where: { email } });
  if (!master) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, master.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 });
  }

  const token = generateToken({
    id: master.id,
    email: master.email,
    role: 'master',
    companyId: null,
    storeId: null,
  });

  return { token };
}
