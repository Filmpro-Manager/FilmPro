import prisma from '../lib/prisma';
import { handlePrismaError } from '../utils/prisma-error';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const quoteSelect = {
  id: true,
  storeId: true,
  number: true,
  status: true,
  clientId: true,
  clientName: true,
  clientPhone: true,
  clientEmail: true,
  clientDocument: true,
  clientDocumentType: true,
  category: true,
  subject: true,
  sellerId: true,
  sellerName: true,
  createdById: true,
  createdByName: true,
  subtotal: true,
  discount: true,
  discountType: true,
  taxes: true,
  totalValue: true,
  acceptedPaymentMethods: true,
  payment: true,
  notes: true,
  internalNotes: true,
  issueDate: true,
  validUntil: true,
  convertedAt: true,
  convertedToAppointmentId: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      type: true,
      name: true,
      description: true,
      quantity: true,
      unit: true,
      unitPrice: true,
      discount: true,
      discountType: true,
      total: true,
      productId: true,
      serviceId: true,
      vehicleId: true,
    },
  },
} as const;

/** Gera número sequencial: ORC-AAAA-XXX */
async function generateNumber(storeId: string): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quote.count({
    where: { storeId, number: { startsWith: `ORC-${year}-` } },
  });
  return `ORC-${year}-${String(count + 1).padStart(3, '0')}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteItemInput {
  type: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discount?: number;
  discountType?: string;
  total: number;
  productId?: string;
  serviceId?: string;
  vehicleId?: string;
}

interface CreateQuoteInput {
  storeId: string;
  clientId?: string;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  clientDocument?: string;
  clientDocumentType?: string;
  category?: string;
  subject?: object;
  sellerId?: string;
  sellerName?: string;
  createdById?: string;
  createdByName?: string;
  subtotal: number;
  discount?: number;
  discountType?: string;
  taxes?: number;
  totalValue: number;
  acceptedPaymentMethods?: string[];
  payment?: object;
  notes?: string;
  internalNotes?: string;
  issueDate?: string;
  validUntil?: string;
  items: QuoteItemInput[];
}

interface UpdateQuoteInput extends Omit<Partial<CreateQuoteInput>, 'storeId' | 'items'> {
  items?: QuoteItemInput[];
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAllByStore(storeId: string, createdById?: string) {
  return prisma.quote.findMany({
    where: { storeId, ...(createdById ? { createdById } : {}) },
    select: quoteSelect,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id: string, storeId: string) {
  return prisma.quote.findFirst({
    where: { id, storeId },
    select: quoteSelect,
  });
}

export async function create(input: CreateQuoteInput) {
  try {
    const number = await generateNumber(input.storeId);
    return await prisma.quote.create({
      data: {
        storeId: input.storeId,
        number,
        status: 'draft',
        clientId: input.clientId ?? null,
        clientName: input.clientName,
        clientPhone: input.clientPhone ?? null,
        clientEmail: input.clientEmail ?? null,
        clientDocument: input.clientDocument ?? null,
        clientDocumentType: input.clientDocumentType ?? null,
        category: input.category ?? null,
        subject: input.subject ?? undefined,
        sellerId: input.sellerId ?? null,
        sellerName: input.sellerName ?? null,
        createdById: input.createdById ?? null,
        createdByName: input.createdByName ?? null,
        subtotal: input.subtotal,
        discount: input.discount ?? 0,
        discountType: input.discountType ?? null,
        taxes: input.taxes ?? null,
        totalValue: input.totalValue,
        acceptedPaymentMethods: input.acceptedPaymentMethods ?? [],
        payment: input.payment ?? undefined,
        notes: input.notes ?? null,
        internalNotes: input.internalNotes ?? null,
        issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        items: {
          create: input.items.map((item) => ({
            type: item.type,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit: item.unit ?? 'un',
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            discountType: item.discountType ?? 'value',
            total: item.total,
            productId: item.productId ?? null,
            serviceId: item.serviceId ?? null,
            vehicleId: item.vehicleId ?? null,
          })),
        },
      },
      select: quoteSelect,
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Orçamento' });
  }
}

export async function update(id: string, storeId: string, input: UpdateQuoteInput) {
  const existing = await prisma.quote.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404 });

  try {
    return await prisma.$transaction(async (tx) => {
      // Substitui todos os itens se passados
      if (input.items !== undefined) {
        await tx.quoteItem.deleteMany({ where: { quoteId: id } });
        await tx.quoteItem.createMany({
          data: input.items.map((item) => ({
            quoteId: id,
            type: item.type,
            name: item.name,
            description: item.description ?? null,
            quantity: item.quantity,
            unit: item.unit ?? 'un',
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            discountType: item.discountType ?? 'value',
            total: item.total,
            productId: item.productId ?? null,
            serviceId: item.serviceId ?? null,
            vehicleId: item.vehicleId ?? null,
          })),
        });
      }

      return tx.quote.update({
        where: { id },
        data: {
          ...(input.clientId !== undefined && { clientId: input.clientId }),
          ...(input.clientName !== undefined && { clientName: input.clientName }),
          ...(input.clientPhone !== undefined && { clientPhone: input.clientPhone }),
          ...(input.clientEmail !== undefined && { clientEmail: input.clientEmail }),
          ...(input.clientDocument !== undefined && { clientDocument: input.clientDocument }),
          ...(input.clientDocumentType !== undefined && { clientDocumentType: input.clientDocumentType }),
          ...(input.category !== undefined && { category: input.category }),
          ...(input.subject !== undefined && { subject: input.subject }),
          ...(input.sellerId !== undefined && { sellerId: input.sellerId }),
          ...(input.sellerName !== undefined && { sellerName: input.sellerName }),
          ...(input.subtotal !== undefined && { subtotal: input.subtotal }),
          ...(input.discount !== undefined && { discount: input.discount }),
          ...(input.discountType !== undefined && { discountType: input.discountType }),
          ...(input.taxes !== undefined && { taxes: input.taxes }),
          ...(input.totalValue !== undefined && { totalValue: input.totalValue }),
          ...(input.acceptedPaymentMethods !== undefined && { acceptedPaymentMethods: input.acceptedPaymentMethods }),
          ...(input.payment !== undefined && { payment: input.payment }),
          ...(input.notes !== undefined && { notes: input.notes }),
          ...(input.internalNotes !== undefined && { internalNotes: input.internalNotes }),
          ...(input.issueDate !== undefined && { issueDate: new Date(input.issueDate) }),
          ...(input.validUntil !== undefined && { validUntil: input.validUntil ? new Date(input.validUntil) : null }),
        },
        select: quoteSelect,
      });
    });
  } catch (e) {
    handlePrismaError(e, { entity: 'Orçamento' });
  }
}

export async function updateStatus(id: string, storeId: string, status: string) {
  const existing = await prisma.quote.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404 });

  return prisma.quote.update({
    where: { id },
    data: { status },
    select: quoteSelect,
  });
}

export async function convertToAppointment(id: string, storeId: string, appointmentId: string) {
  const existing = await prisma.quote.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404 });

  return prisma.quote.update({
    where: { id },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      convertedToAppointmentId: appointmentId,
    },
    select: quoteSelect,
  });
}

export async function remove(id: string, storeId: string) {
  const existing = await prisma.quote.findFirst({ where: { id, storeId } });
  if (!existing) throw Object.assign(new Error('Orçamento não encontrado'), { statusCode: 404 });

  await prisma.quote.delete({ where: { id } });
}
