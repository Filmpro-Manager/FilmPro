import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

const itemSelect = {
  id: true,
  name: true,
  brand: true,
  type: true,
  unit: true,
  quantity: true,
  minQuantity: true,
  costPrice: true,
  pricePerUnit: true,
  transparency: true,
  sku: true,
  createdAt: true,
  updatedAt: true,
} as const;

const movementSelect = {
  id: true,
  type: true,
  quantity: true,
  reason: true,
  createdAt: true,
  inventoryItem: {
    select: { id: true, name: true, brand: true },
  },
  user: {
    select: { id: true, name: true },
  },
} as const;

// ─── INPUT TYPES ────────────────────────────────────────────────────────────

export interface CreateItemInput {
  storeId: string;
  userId: string;
  name: string;
  brand: string;
  type: string;
  unit?: string;
  quantity?: number;
  minQuantity?: number;
  costPrice?: number;
  pricePerUnit?: number;
  transparency?: number;
  sku?: string;
}

export interface UpdateItemInput {
  name?: string;
  brand?: string;
  type?: string;
  unit?: string;
  minQuantity?: number;
  costPrice?: number;
  pricePerUnit?: number;
  transparency?: number;
  sku?: string;
}

export interface CreateMovementInput {
  storeId: string;
  inventoryItemId: string;
  userId: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  reason?: string;
}

// ─── ITEMS ──────────────────────────────────────────────────────────────────

export async function getAllItems(storeId: string) {
  return prisma.inventoryItem.findMany({
    where: { storeId },
    select: itemSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getItemById(id: string, storeId: string) {
  return prisma.inventoryItem.findFirst({
    where: { id, storeId },
    select: itemSelect,
  });
}

export async function createItem(input: CreateItemInput) {
  try {
    const initialQty = input.quantity ?? 0;

    const item = await prisma.inventoryItem.create({
      data: {
        storeId: input.storeId,
        name: input.name,
        brand: input.brand,
        type: input.type,
        unit: input.unit ?? 'm',
        quantity: initialQty,
        minQuantity: input.minQuantity ?? 0,
        costPrice: input.costPrice ?? 0,
        pricePerUnit: input.pricePerUnit ?? 0,
        transparency: input.transparency ?? 0,
        sku: input.sku,
      },
      select: itemSelect,
    });

    if (initialQty > 0) {
      await prisma.inventoryMovement.create({
        data: {
          storeId: input.storeId,
          inventoryItemId: item.id,
          userId: input.userId,
          type: 'entrada',
          quantity: initialQty,
          reason: 'Estoque inicial',
        },
      });
    }

    return item;
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function updateItem(id: string, storeId: string, input: UpdateItemInput) {
  try {
    return await prisma.inventoryItem.updateMany({
      where: { id, storeId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.brand !== undefined && { brand: input.brand }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.unit !== undefined && { unit: input.unit }),
        ...(input.minQuantity !== undefined && { minQuantity: input.minQuantity }),
        ...(input.costPrice !== undefined && { costPrice: input.costPrice }),
        ...(input.pricePerUnit !== undefined && { pricePerUnit: input.pricePerUnit }),
        ...(input.transparency !== undefined && { transparency: input.transparency }),
        ...(input.sku !== undefined && { sku: input.sku }),
      },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

export async function deleteItem(id: string, storeId: string) {
  try {
    const movementCount = await prisma.inventoryMovement.count({
      where: { inventoryItemId: id, storeId },
    });

    if (movementCount > 0) {
      throw new Error(
        `Não é possível excluir este item pois ele possui ${movementCount} movimentação(ções) registrada(s). Exclua as movimentações primeiro ou desative o item.`,
      );
    }

    return await prisma.inventoryItem.deleteMany({
      where: { id, storeId },
    });
  } catch (err) {
    throw handlePrismaError(err);
  }
}

// ─── MOVEMENTS ───────────────────────────────────────────────────────────────

export async function getAllMovements(storeId: string, itemId?: string) {
  return prisma.inventoryMovement.findMany({
    where: {
      storeId,
      ...(itemId ? { inventoryItemId: itemId } : {}),
    },
    select: movementSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function createMovement(input: CreateMovementInput) {
  try {
    const item = await prisma.inventoryItem.findFirst({
      where: { id: input.inventoryItemId, storeId: input.storeId },
    });

    if (!item) throw new Error('Item de estoque não encontrado');

    const delta =
      input.type === 'entrada'
        ? input.quantity
        : input.type === 'saida'
        ? -input.quantity
        : input.quantity; // ajuste: quantity pode ser negativo

    const newQuantity = item.quantity + delta;

    if (input.type === 'saida' && newQuantity < 0) {
      throw new Error(
        `Estoque insuficiente. Disponível: ${item.quantity}m, solicitado: ${input.quantity}m`,
      );
    }

    const [movement] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          storeId: input.storeId,
          inventoryItemId: input.inventoryItemId,
          userId: input.userId,
          type: input.type,
          quantity: input.quantity,
          reason: input.reason,
        },
        select: movementSelect,
      }),
      prisma.inventoryItem.update({
        where: { id: input.inventoryItemId },
        data: { quantity: newQuantity },
      }),
    ]);

    return movement;
  } catch (err) {
    throw handlePrismaError(err);
  }
}
