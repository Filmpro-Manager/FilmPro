import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';
import * as serviceOrderService from './service-order.service';

// ─── Select ───────────────────────────────────────────────────────────────────

const appointmentSelect = {
  id: true,
  storeId: true,
  number: true,
  status: true,
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
  value: true,
  quoteId: true,
  materialsUsed: true,
  notes: true,
  createdById: true,
  createdByName: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Gera número sequencial: AGD-AAAA-XXX */
async function generateNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.appointment.count({ where: { storeId } });
  return `AGD-${year}-${String(count + 1).padStart(3, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateAppointmentInput {
  storeId: string;
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
  quoteId?: string;
  materialsUsed?: object;
  notes?: string;
  createdById?: string;
  createdByName?: string;
}

type UpdateAppointmentInput = Partial<Omit<CreateAppointmentInput, 'storeId' | 'quoteId'>>;

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAllByStore(storeId: string) {
  return prisma.appointment.findMany({
    where: { storeId },
    select: appointmentSelect,
    orderBy: { date: 'desc' },
  });
}

export async function getById(id: string, storeId: string) {
  return prisma.appointment.findFirst({
    where: { id, storeId },
    select: appointmentSelect,
  });
}

export async function create(input: CreateAppointmentInput) {
  try {
    const number = await generateNumber(input.storeId);

    return await prisma.appointment.create({
      data: {
        storeId: input.storeId,
        number,
        status: 'scheduled',
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
        value: input.value ?? 0,
        quoteId: input.quoteId ?? null,
        materialsUsed: input.materialsUsed ?? undefined,
        notes: input.notes ?? null,
        createdById: input.createdById ?? null,
        createdByName: input.createdByName ?? null,
      },
      select: appointmentSelect,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function update(id: string, storeId: string, input: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 });

  try {
    return await prisma.appointment.update({
      where: { id },
      data: {
        ...(input.clientName   !== undefined && { clientName: input.clientName }),
        ...(input.vehicle      !== undefined && { vehicle: input.vehicle }),
        ...(input.subject      !== undefined && { subject: input.subject }),
        ...(input.serviceType  !== undefined && { serviceType: input.serviceType }),
        ...(input.employeeId   !== undefined && { employeeId: input.employeeId }),
        ...(input.employeeName !== undefined && { employeeName: input.employeeName }),
        ...(input.date         !== undefined && { date: input.date }),
        ...(input.endDate      !== undefined && { endDate: input.endDate }),
        ...(input.startTime    !== undefined && { startTime: input.startTime }),
        ...(input.endTime      !== undefined && { endTime: input.endTime }),
        ...(input.value        !== undefined && { value: input.value }),
        ...(input.materialsUsed !== undefined && { materialsUsed: input.materialsUsed }),
        ...(input.notes        !== undefined && { notes: input.notes }),
        ...(input.createdById  !== undefined && { createdById: input.createdById }),
        ...(input.createdByName !== undefined && { createdByName: input.createdByName }),
      },
      select: appointmentSelect,
    });
  } catch (error) {
    throw handlePrismaError(error);
  }
}

export async function updateStatus(id: string, storeId: string, status: string) {
  const existing = await prisma.appointment.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 });

  // Se o agendamento está sendo cancelado, cancela a OS vinculada (se ainda não iniciada/finalizada)
  if (status === 'cancelled') {
    await prisma.serviceOrder.updateMany({
      where: {
        storeId,
        sourceAppointmentId: id,
        status: { in: ['scheduled', 'draft'] },
      },
      data: { status: 'cancelled' },
    });
  }

  return prisma.appointment.update({
    where: { id },
    data: { status },
    select: appointmentSelect,
  });
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.appointment.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 });

  // Cancela a OS vinculada se ainda não foi iniciada ou finalizada
  await prisma.serviceOrder.updateMany({
    where: {
      storeId,
      sourceAppointmentId: id,
      status: { in: ['scheduled', 'draft'] },
    },
    data: { status: 'cancelled' },
  });

  await prisma.appointment.delete({ where: { id } });
}

export async function convertToServiceOrder(
  id: string,
  storeId: string,
  createdById?: string,
  createdByName?: string,
) {
  const appt = await prisma.appointment.findFirst({ where: { id, storeId }, select: appointmentSelect });
  if (!appt) throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 });

  const so = await serviceOrderService.create({
    storeId,
    clientId:              appt.clientId   ?? undefined,
    clientName:            appt.clientName,
    vehicle:               appt.vehicle    ?? undefined,
    subject:               appt.subject    as object | undefined,
    serviceType:           appt.serviceType,
    employeeId:            appt.employeeId  ?? undefined,
    employeeName:          appt.employeeName ?? undefined,
    date:                  appt.date,
    endDate:               appt.endDate     ?? undefined,
    startTime:             appt.startTime   ?? undefined,
    endTime:               appt.endTime     ?? undefined,
    value:                 appt.value,
    notes:                 appt.notes       ?? undefined,
    sourceAppointmentId:   id,
    createdById:           createdById,
    createdByName:         createdByName,
  });

  // Marca o agendamento como convertido
  await prisma.appointment.update({
    where: { id },
    data: { status: 'completed' },
  });

  return so;
}
