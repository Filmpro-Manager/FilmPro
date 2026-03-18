import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

const select = {
  id: true,
  storeId: true,
  appointmentId: true,
  clientId: true,
  clientName: true,
  score: true,
  comment: true,
  createdAt: true,
} as const;

export interface CreateRatingInput {
  storeId: string;
  appointmentId?: string;
  clientId?: string;
  clientName?: string;
  score: number;
  comment?: string;
}

export async function getAllByStore(storeId: string) {
  return prisma.clientRating.findMany({
    where: { storeId },
    select,
    orderBy: { createdAt: 'desc' },
  });
}

export async function create(input: CreateRatingInput) {
  try {
    return await prisma.clientRating.create({
      data: {
        storeId: input.storeId,
        appointmentId: input.appointmentId ?? null,
        clientId: input.clientId ?? null,
        clientName: input.clientName ?? null,
        score: input.score,
        comment: input.comment ?? null,
      },
      select,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.clientRating.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Avaliação não encontrada'), { statusCode: 404 });
  await prisma.clientRating.delete({ where: { id } });
}
