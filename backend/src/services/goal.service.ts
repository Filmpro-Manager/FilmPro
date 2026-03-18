import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

const select = {
  id: true,
  storeId: true,
  employeeId: true,
  employeeName: true,
  type: true,
  period: true,
  target: true,
  achieved: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface CreateGoalInput {
  storeId: string;
  employeeId?: string;
  employeeName?: string;
  type: string;
  period: string;
  target: number;
  achieved?: number;
}

export async function getAllByStore(storeId: string) {
  return prisma.goal.findMany({
    where: { storeId },
    select,
    orderBy: { period: 'desc' },
  });
}

export async function create(input: CreateGoalInput) {
  try {
    return await prisma.goal.create({
      data: {
        storeId: input.storeId,
        employeeId: input.employeeId ?? null,
        employeeName: input.employeeName ?? null,
        type: input.type,
        period: input.period,
        target: input.target,
        achieved: input.achieved ?? 0,
      },
      select,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function update(id: string, storeId: string, input: Partial<Omit<CreateGoalInput, 'storeId'>>) {
  const existing = await prisma.goal.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Meta não encontrada'), { statusCode: 404 });

  try {
    return await prisma.goal.update({
      where: { id },
      data: {
        ...(input.target   !== undefined && { target: input.target }),
        ...(input.achieved !== undefined && { achieved: input.achieved }),
        ...(input.period   !== undefined && { period: input.period }),
        ...(input.type     !== undefined && { type: input.type }),
      },
      select,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.goal.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Meta não encontrada'), { statusCode: 404 });
  await prisma.goal.delete({ where: { id } });
}
