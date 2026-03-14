import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

interface CreateStoreInput {
  companyId: string;
  name: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  phone: string;
  email: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement?: string;
  addressDistrict: string;
  addressZipcode: string;
  addressCity: string;
  addressState: string;
  logoUrl?: string;
}

const ALLOWED_UPDATE_FIELDS = [
  'name', 'logoUrl', 'razaoSocial', 'nomeFantasia', 'cnpj', 'phone', 'email',
  'addressStreet', 'addressNumber', 'addressComplement', 'addressDistrict',
  'addressZipcode', 'addressCity', 'addressState', 'setupCompleted', 'status',
] as const;

type UpdateStoreField = typeof ALLOWED_UPDATE_FIELDS[number];
type UpdateStoreInput = Partial<Record<UpdateStoreField, string | boolean | null>>;

export async function getAll(companyId?: string) {
  return prisma.store.findMany({
    where: companyId ? { companyId } : undefined,
    select: {
      id: true,
      name: true,
      nomeFantasia: true,
      cnpj: true,
      phone: true,
      email: true,
      addressCity: true,
      addressState: true,
      setupCompleted: true,
      status: true,
      createdAt: true,
      company: { select: { id: true, name: true } },
      _count: { select: { users: true } },
    },
  });
}

export async function getById(id: string) {
  return prisma.store.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } },
      users: { select: { id: true, name: true, email: true, role: true, status: true } },
    },
  });
}

export async function create(data: CreateStoreInput) {
  try {
    return await prisma.store.create({ data });
  } catch (e) {
    handlePrismaError(e, { entity: 'Loja', field: 'cnpj' });
  }
}

export async function update(id: string, data: UpdateStoreInput) {
  const updateData = Object.fromEntries(
    Object.entries(data).filter(([key]) => ALLOWED_UPDATE_FIELDS.includes(key as UpdateStoreField))
  );
  try {
    return await prisma.store.update({ where: { id }, data: updateData });
  } catch (e) {
    handlePrismaError(e, { entity: 'Loja', field: 'cnpj' });
  }
}

export async function activate(id: string) {
  try {
    return await prisma.store.update({ where: { id }, data: { status: 'active' } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Loja' });
  }
}

export async function deactivate(id: string) {
  try {
    return await prisma.store.update({ where: { id }, data: { status: 'inactive' } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Loja' });
  }
}

export async function remove(id: string) {
  try {
    return await prisma.store.delete({ where: { id } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Loja' });
  }
}
