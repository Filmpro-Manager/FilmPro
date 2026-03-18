import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

const clientSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  document: true,
  notes: true,
  addressZipcode: true,
  addressStreet: true,
  addressNumber: true,
  addressComplement: true,
  addressDistrict: true,
  addressCity: true,
  addressState: true,
  createdAt: true,
  updatedAt: true,
  vehicles: {
    select: {
      id: true,
      brand: true,
      model: true,
      year: true,
      plate: true,
      color: true,
      notes: true,
      createdAt: true,
    },
  },
} as const;

interface CreateClientInput {
  storeId: string;
  name: string;
  phone?: string;
  email?: string;
  document?: string;
  notes?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
}

interface UpdateClientInput {
  name?: string;
  phone?: string;
  email?: string;
  document?: string;
  notes?: string;
  addressZipcode?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressDistrict?: string;
  addressCity?: string;
  addressState?: string;
}

interface CreateVehicleInput {
  clientId: string;
  storeId: string;
  brand: string;
  model: string;
  year?: number;
  plate?: string;
  color?: string;
  notes?: string;
}

interface UpdateVehicleInput {
  brand?: string;
  model?: string;
  year?: number | null;
  plate?: string;
  color?: string;
  notes?: string;
}

// ─── CLIENTS ───────────────────────────────────────────────────────────────

export async function getAllByStore(storeId: string) {
  return prisma.client.findMany({
    where: { storeId },
    select: clientSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string, storeId: string) {
  return prisma.client.findFirst({
    where: { id, storeId },
    select: clientSelect,
  });
}

export async function create(input: CreateClientInput) {
  try {
    return await prisma.client.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        document: input.document ?? null,
        notes: input.notes ?? null,
        addressZipcode: input.addressZipcode ?? null,
        addressStreet: input.addressStreet ?? null,
        addressNumber: input.addressNumber ?? null,
        addressComplement: input.addressComplement ?? null,
        addressDistrict: input.addressDistrict ?? null,
        addressCity: input.addressCity ?? null,
        addressState: input.addressState ?? null,
      },
      select: clientSelect,
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Cliente' });
  }
}

export async function update(id: string, storeId: string, data: UpdateClientInput) {
  try {
    return await prisma.client.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.addressZipcode !== undefined && { addressZipcode: data.addressZipcode }),
        ...(data.addressStreet !== undefined && { addressStreet: data.addressStreet }),
        ...(data.addressNumber !== undefined && { addressNumber: data.addressNumber }),
        ...(data.addressComplement !== undefined && { addressComplement: data.addressComplement }),
        ...(data.addressDistrict !== undefined && { addressDistrict: data.addressDistrict }),
        ...(data.addressCity !== undefined && { addressCity: data.addressCity }),
        ...(data.addressState !== undefined && { addressState: data.addressState }),
      },
      select: clientSelect,
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Cliente' });
  }
}

export async function remove(id: string, storeId: string) {
  const client = await prisma.client.findFirst({ where: { id, storeId } });
  if (!client) throw Object.assign(new Error('Cliente não encontrado'), { statusCode: 404 });

  try {
    await prisma.client.delete({ where: { id } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Cliente' });
  }
}

// ─── VEHICLES ──────────────────────────────────────────────────────────────

export async function createVehicle(input: CreateVehicleInput) {
  try {
    return await prisma.vehicle.create({
      data: {
        clientId: input.clientId,
        storeId: input.storeId,
        brand: input.brand,
        model: input.model,
        year: input.year ?? null,
        plate: input.plate ?? null,
        color: input.color ?? null,
        notes: input.notes ?? null,
      },
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Veículo' });
  }
}

export async function updateVehicle(id: string, storeId: string, data: UpdateVehicleInput) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, storeId } });
  if (!vehicle) throw Object.assign(new Error('Veículo não encontrado'), { statusCode: 404 });

  try {
    return await prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.brand !== undefined && { brand: data.brand }),
        ...(data.model !== undefined && { model: data.model }),
        ...(data.year !== undefined && { year: data.year }),
        ...(data.plate !== undefined && { plate: data.plate }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Veículo' });
  }
}

export async function removeVehicle(id: string, storeId: string) {
  const vehicle = await prisma.vehicle.findFirst({ where: { id, storeId } });
  if (!vehicle) throw Object.assign(new Error('Veículo não encontrado'), { statusCode: 404 });

  try {
    await prisma.vehicle.delete({ where: { id } });
  } catch (e) {
    handlePrismaError(e, { entity: 'Veículo' });
  }
}
