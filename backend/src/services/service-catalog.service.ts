import prisma from '../lib/prisma';

const serviceSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  price: true,
  estimatedMinutes: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function findAll(storeId: string, onlyActive = false) {
  return prisma.serviceCatalog.findMany({
    where: { storeId, ...(onlyActive ? { isActive: true } : {}) },
    select: serviceSelect,
    orderBy: { name: 'asc' },
  });
}

export async function findById(id: string, storeId: string) {
  return prisma.serviceCatalog.findFirst({
    where: { id, storeId },
    select: serviceSelect,
  });
}

export interface CreateServiceInput {
  storeId: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  estimatedMinutes?: number;
  isActive?: boolean;
}

export async function create(data: CreateServiceInput) {
  return prisma.serviceCatalog.create({
    data: {
      storeId: data.storeId,
      name: data.name,
      description: data.description,
      category: data.category,
      price: data.price,
      estimatedMinutes: data.estimatedMinutes,
      isActive: data.isActive ?? true,
    },
    select: serviceSelect,
  });
}

export interface UpdateServiceInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  estimatedMinutes?: number;
  isActive?: boolean;
}

export async function update(id: string, storeId: string, data: UpdateServiceInput) {
  // Verifica ownership
  const existing = await prisma.serviceCatalog.findFirst({ where: { id, storeId } });
  if (!existing) return null;

  return prisma.serviceCatalog.update({
    where: { id },
    data,
    select: serviceSelect,
  });
}

export async function toggleActive(id: string, storeId: string) {
  const service = await prisma.serviceCatalog.findFirst({ where: { id, storeId } });
  if (!service) return null;

  return prisma.serviceCatalog.update({
    where: { id },
    data: { isActive: !service.isActive },
    select: serviceSelect,
  });
}

export async function remove(id: string, storeId: string) {
  return prisma.serviceCatalog.deleteMany({
    where: { id, storeId },
  });
}
