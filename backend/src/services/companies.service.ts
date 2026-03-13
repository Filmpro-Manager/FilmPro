import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

interface CreateCompanyInput {
  name: string;
  email: string;
  phone: string;
  status?: string;
}

interface UpdateCompanyInput {
  name?: string;
  email?: string;
  phone?: string;
  status?: string;
}

export async function getAll() {
  return prisma.company.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      _count: { select: { stores: true, users: true } },
    },
  });
}

export async function getById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      stores: true,
      users: { select: { id: true, name: true, email: true, role: true, status: true } },
    },
  });
}

export async function create(data: CreateCompanyInput) {
  try {
    return await prisma.company.create({ data });
  } catch (e) {
    handlePrismaError(e, { entity: 'Empresa', field: 'email' });
  }
}

export async function update(id: string, data: UpdateCompanyInput) {
  try {
    return await prisma.company.update({ where: { id }, data });
  } catch (e) {
    handlePrismaError(e, { entity: 'Empresa', field: 'email' });
  }
}

export async function activate(id: string) {
  try {
    return await prisma.company.update({ where: { id }, data: { status: 'active' } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Empresa' });
  }
}

export async function deactivate(id: string) {
  try {
    return await prisma.company.update({ where: { id }, data: { status: 'inactive' } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Empresa' });
  }
}

export async function remove(id: string) {
  try {
    return await prisma.company.delete({ where: { id } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Empresa' });
  }
}
