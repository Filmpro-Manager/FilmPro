import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

const select = {
  id: true,
  storeId: true,
  type: true,
  description: true,
  amount: true,
  date: true,
  dueDate: true,
  paidDate: true,
  isPaid: true,
  category: true,
  costCenter: true,
  paymentMethod: true,
  isRecurring: true,
  recurrenceDay: true,
  installments: true,
  installmentNum: true,
  installmentRef: true,
  clientId: true,
  clientName: true,
  appointmentId: true,
  invoiceId: true,
  createdById: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface CreateTransactionInput {
  storeId: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string;
  paidDate?: string;
  isPaid?: boolean;
  category: string;
  costCenter?: string;
  paymentMethod?: string;
  isRecurring?: boolean;
  recurrenceDay?: number;
  installments?: number;
  installmentNum?: number;
  installmentRef?: string;
  clientId?: string;
  clientName?: string;
  appointmentId?: string;
  invoiceId?: string;
  createdById?: string;
  createdByName?: string;
}

export type UpdateTransactionInput = Partial<Omit<CreateTransactionInput, 'storeId'>>;

export async function getAllByStore(storeId: string) {
  return prisma.transaction.findMany({
    where: { storeId },
    select,
    orderBy: { date: 'desc' },
  });
}

export async function getById(id: string, storeId: string) {
  return prisma.transaction.findFirst({ where: { id, storeId }, select });
}

export async function create(input: CreateTransactionInput) {
  try {
    return await prisma.transaction.create({
      data: {
        storeId: input.storeId,
        type: input.type,
        description: input.description,
        amount: input.amount,
        date: input.date,
        dueDate: input.dueDate ?? null,
        paidDate: input.paidDate ?? null,
        isPaid: input.isPaid ?? true,
        category: input.category,
        costCenter: input.costCenter ?? null,
        paymentMethod: input.paymentMethod ?? null,
        isRecurring: input.isRecurring ?? false,
        recurrenceDay: input.recurrenceDay ?? null,
        installments: input.installments ?? null,
        installmentNum: input.installmentNum ?? null,
        installmentRef: input.installmentRef ?? null,
        clientId: input.clientId ?? null,
        clientName: input.clientName ?? null,
        appointmentId: input.appointmentId ?? null,
        invoiceId: input.invoiceId ?? null,
        createdById: input.createdById ?? null,
        createdByName: input.createdByName ?? null,
      },
      select,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function update(id: string, storeId: string, input: UpdateTransactionInput) {
  const existing = await prisma.transaction.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Transação não encontrada'), { statusCode: 404 });

  try {
    return await prisma.transaction.update({
      where: { id },
      data: {
        ...(input.type        !== undefined && { type: input.type }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.amount      !== undefined && { amount: input.amount }),
        ...(input.date        !== undefined && { date: input.date }),
        ...(input.dueDate     !== undefined && { dueDate: input.dueDate }),
        ...(input.isPaid      !== undefined && { isPaid: input.isPaid }),
        ...(input.category    !== undefined && { category: input.category }),
        ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
      },
      select,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.transaction.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Transação não encontrada'), { statusCode: 404 });
  await prisma.transaction.delete({ where: { id } });
}
