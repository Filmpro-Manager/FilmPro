import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';
import * as transactionService from './transaction.service';

// ─── Select ───────────────────────────────────────────────────────────────────

const serviceOrderSelect = {
  id: true,
  storeId: true,
  number: true,
  quoteId: true,
  clientId: true,
  clientName: true,
  vehicle: true,
  subject: true,
  serviceType: true,
  employeeId: true,
  employeeName: true,
  date: true,
  endDate: true,
  startTime: true,
  endTime: true,
  status: true,
  value: true,
  items: true,
  notes: true,
  internalNotes: true,
  sourceAppointmentId: true,
  createdById: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Gera número sequencial: OS-AAAA-XXX */
async function generateNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.serviceOrder.count({
    where: { storeId },
  });
  return `OS-${year}-${String(count + 1).padStart(3, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateServiceOrderInput {
  storeId: string;
  quoteId?: string;
  clientId?: string;
  clientName: string;
  vehicle?: string;
  subject?: object;
  serviceType?: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  value?: number;
  items?: object;
  notes?: string;
  internalNotes?: string;
  sourceAppointmentId?: string;
  createdById?: string;
  createdByName?: string;
}

type UpdateServiceOrderInput = Partial<Omit<CreateServiceOrderInput, 'storeId' | 'quoteId'>>;

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAllByStore(storeId: string) {
  return prisma.serviceOrder.findMany({
    where: { storeId },
    select: serviceOrderSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string, storeId: string) {
  return prisma.serviceOrder.findFirst({
    where: { id, storeId },
    select: serviceOrderSelect,
  });
}

export async function create(input: CreateServiceOrderInput) {
  try {
    const number = await generateNumber(input.storeId);

    const serviceOrder = await prisma.serviceOrder.create({
      data: {
        storeId: input.storeId,
        number,
        quoteId: input.quoteId ?? null,
        clientId: input.clientId ?? null,
        clientName: input.clientName,
        vehicle: input.vehicle ?? null,
        subject: input.subject ?? undefined,
        serviceType: input.serviceType ?? 'Serviço',
        employeeId: input.employeeId ?? null,
        employeeName: input.employeeName ?? null,
        date: input.date,
        endDate: input.endDate ?? null,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        status: 'scheduled',
        value: input.value ?? 0,
        items: input.items ?? undefined,
        notes: input.notes ?? null,
        internalNotes: input.internalNotes ?? null,
        sourceAppointmentId: input.sourceAppointmentId ?? null,
        createdById: input.createdById ?? null,
        createdByName: input.createdByName ?? null,
      },
      select: serviceOrderSelect,
    });

    // Marca o orçamento como convertido
    if (input.quoteId) {
      await prisma.quote.update({
        where: { id: input.quoteId },
        data: {
          status: 'converted',
          convertedAt: new Date(),
          convertedToAppointmentId: serviceOrder.id,
        },
      }).catch(() => {/* orçamento pode não existir, ignora */});
    }

    return serviceOrder;
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function update(id: string, storeId: string, input: UpdateServiceOrderInput) {
  const existing = await prisma.serviceOrder.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Ordem de Serviço não encontrada'), { statusCode: 404 });

  try {
    return await prisma.serviceOrder.update({
      where: { id },
      data: {
        ...(input.clientName      !== undefined && { clientName: input.clientName }),
        ...(input.vehicle         !== undefined && { vehicle: input.vehicle }),
        ...(input.subject         !== undefined && { subject: input.subject }),
        ...(input.serviceType     !== undefined && { serviceType: input.serviceType }),
        ...(input.employeeId      !== undefined && { employeeId: input.employeeId }),
        ...(input.employeeName    !== undefined && { employeeName: input.employeeName }),
        ...(input.date            !== undefined && { date: input.date }),
        ...(input.endDate         !== undefined && { endDate: input.endDate }),
        ...(input.startTime       !== undefined && { startTime: input.startTime }),
        ...(input.endTime         !== undefined && { endTime: input.endTime }),
        ...(input.value           !== undefined && { value: input.value }),
        ...(input.notes           !== undefined && { notes: input.notes }),
        ...(input.internalNotes   !== undefined && { internalNotes: input.internalNotes }),
        ...(input.createdById     !== undefined && { createdById: input.createdById }),
        ...(input.createdByName   !== undefined && { createdByName: input.createdByName }),
      },
      select: serviceOrderSelect,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function updateStatus(id: string, storeId: string, status: string) {
  const existing = await prisma.serviceOrder.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Ordem de Serviço não encontrada'), { statusCode: 404 });

  return prisma.serviceOrder.update({
    where: { id },
    data: { status },
    select: serviceOrderSelect,
  });
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.serviceOrder.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Ordem de Serviço não encontrada'), { statusCode: 404 });

  await prisma.serviceOrder.delete({ where: { id } });
}

export interface CompleteWithPaymentInput {
  paymentMethod: string;
  isPaid: boolean;
  paidDate?: string;
  installments?: number;
  createdById?: string;
  createdByName?: string;
}

export async function completeWithPayment(
  id: string,
  storeId: string,
  input: CompleteWithPaymentInput,
) {
  const so = await prisma.serviceOrder.findFirst({ where: { id, storeId }, select: serviceOrderSelect });
  if (!so) throw Object.assign(new Error('Ordem de Serviço não encontrada'), { statusCode: 404 });

  // Marca a OS como concluída
  const updated = await prisma.serviceOrder.update({
    where: { id },
    data: { status: 'completed' },
    select: serviceOrderSelect,
  });

  const today = new Date().toISOString().slice(0, 10);

  if (input.installments && input.installments > 1) {
    // Cria uma transação por parcela
    const installmentRef = crypto.randomUUID();
    const installmentValue = Number((so.value / input.installments).toFixed(2));

    for (let i = 1; i <= input.installments; i++) {
      await transactionService.create({
        storeId,
        type: 'income',
        description: `${so.serviceType} – ${so.clientName} (${i}/${input.installments})`,
        amount: installmentValue,
        date: today,
        isPaid: i === 1 ? input.isPaid : false,
        paidDate: i === 1 && input.isPaid ? (input.paidDate ?? today) : undefined,
        paidAmount: i === 1 && input.isPaid ? installmentValue : undefined,
        category: 'Serviços',
        paymentMethod: input.paymentMethod,
        installments: input.installments,
        installmentNum: i,
        installmentRef,
        clientId: so.clientId ?? undefined,
        clientName: so.clientName,
        appointmentId: id,
        createdById: input.createdById,
        createdByName: input.createdByName,
      });
    }
  } else {
    // Cria uma única transação
    await transactionService.create({
      storeId,
      type: 'income',
      description: `${so.serviceType} – ${so.clientName}`,
      amount: so.value,
      date: today,
      isPaid: input.isPaid,
      paidDate: input.isPaid ? (input.paidDate ?? today) : undefined,
      paidAmount: input.isPaid ? so.value : undefined,
      category: 'Serviços',
      paymentMethod: input.paymentMethod,
      clientId: so.clientId ?? undefined,
      clientName: so.clientName,
      appointmentId: id,
      createdById: input.createdById,
      createdByName: input.createdByName,
    });
  }

  return updated;
}
