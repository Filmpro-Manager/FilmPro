import { createHmac } from 'crypto';
import prisma from '../lib/prisma';

// ─── Config ──────────────────────────────────────────────────────────────────
const OPENPIX_BASE = 'https://api.openpix.com.br';
const OPENPIX_APP_ID = process.env.OPENPIX_APP_ID ?? '';
const OPENPIX_WEBHOOK_SECRET = process.env.OPENPIX_WEBHOOK_SECRET ?? '';
const PRICE_PER_STORE_CENTS = parseInt(process.env.PRICE_PER_STORE_CENTS ?? '7990', 10); // R$ 79,90
const CHARGE_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 3; // 3 dias

// ─── OpenPix helpers ─────────────────────────────────────────────────────────
async function openpixPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${OPENPIX_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: OPENPIX_APP_ID,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;

  if (!res.ok) {
    const err = data as { error?: string; message?: string };
    throw Object.assign(
      new Error(err.error ?? err.message ?? 'Erro na OpenPix'),
      { statusCode: res.status },
    );
  }

  return data;
}

// ─── Subscription helpers ─────────────────────────────────────────────────────

/**
 * Garante que a empresa tem uma Subscription. Se não tiver, cria com vencimento em 7 dias.
 */
export async function ensureSubscription(companyId: string) {
  const existing = await prisma.subscription.findUnique({ where: { companyId } });
  if (existing) return existing;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // 7 dias de trial

  return prisma.subscription.create({
    data: {
      companyId,
      status: 'active',
      pricePerStore: PRICE_PER_STORE_CENTS,
      dueDate,
    },
  });
}

/**
 * Retorna o status atual da assinatura, atualizando para 'overdue' se vencida.
 */
export async function getSubscriptionStatus(companyId: string) {
  const sub = await ensureSubscription(companyId);

  const now = new Date();
  const isOverdue = sub.status !== 'active' || sub.dueDate < now;

  if (isOverdue && sub.status === 'active') {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'overdue' },
    });
    return { ...sub, status: 'overdue' };
  }

  return sub;
}

/**
 * Retorna todas as informações da assinatura para exibição na página.
 */
export async function getSubscriptionInfo(companyId: string) {
  const sub = await getSubscriptionStatus(companyId);

  const storeCount = await prisma.store.count({
    where: { companyId, status: 'active' },
  });

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, email: true, phone: true },
  });

  const charges = await prisma.pixCharge.findMany({
    where: { subscriptionId: sub.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  // Cobrança pendente mais recente (ainda não vencida)
  const pendingCharge = charges.find(
    (c: { status: string; expiresAt: Date }) => c.status === 'pending' && new Date(c.expiresAt) > new Date(),
  ) ?? null;

  const monthlyAmount = storeCount * sub.pricePerStore;

  return {
    subscription: sub,
    company,
    storeCount,
    monthlyAmount,
    pendingCharge,
    charges,
  };
}

/**
 * Cria uma nova cobrança PIX via OpenPix.
 * Se já existe uma cobrança pendente válida, retorna ela.
 */
export async function createCharge(companyId: string) {
  const sub = await ensureSubscription(companyId);

  const storeCount = await prisma.store.count({
    where: { companyId, status: 'active' },
  });

  if (storeCount === 0) {
    throw Object.assign(
      new Error('Nenhuma loja ativa encontrada para gerar cobrança'),
      { statusCode: 400 },
    );
  }

  // Verificar se já existe cobrança pendente para este mês
  const now = new Date();
  const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const existing = await prisma.pixCharge.findFirst({
    where: {
      subscriptionId: sub.id,
      referenceMonth,
      status: 'pending',
      expiresAt: { gt: now },
    },
  });

  if (existing) return existing;

  const amount = storeCount * sub.pricePerStore;
  const correlationId = `filmpro-${companyId}-${referenceMonth}-${Date.now()}`;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, email: true, phone: true },
  });

  // Mês por extenso em PT-BR
  const monthName = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  interface OpenPixChargeResponse {
    charge: {
      correlationID: string;
      identifier?: string;
      status: string;
      brCode?: string;
      qrCodeImage?: string;
    };
  }

  const response = await openpixPost<OpenPixChargeResponse>('/api/v1/charge', {
    correlationID: correlationId,
    value: amount,
    comment: `Assinatura FilmPro – ${monthName} (${storeCount} loja${storeCount !== 1 ? 's' : ''})`,
    expiresIn: CHARGE_EXPIRES_IN_SECONDS,
    customer: {
      name: company?.name ?? 'Cliente FilmPro',
      email: company?.email ?? '',
      phone: company?.phone ?? '',
    },
  });

  const expiresAt = new Date(Date.now() + CHARGE_EXPIRES_IN_SECONDS * 1000);

  const charge = await prisma.pixCharge.create({
    data: {
      subscriptionId: sub.id,
      correlationId,
      externalId: response.charge.identifier ?? null,
      amount,
      storeCount,
      referenceMonth,
      status: 'pending',
      brCode: response.charge.brCode ?? null,
      qrCodeImage: response.charge.qrCodeImage ?? null,
      expiresAt,
    },
  });

  return charge;
}

/**
 * Verifica a assinatura do webhook da OpenPix.
 */
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!OPENPIX_WEBHOOK_SECRET) return true; // sem secret configurado: aceita tudo (dev)
  const expected = createHmac('sha256', OPENPIX_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return signature === expected;
}

/**
 * Processa o webhook da OpenPix quando um pagamento é confirmado.
 */
export async function handleWebhook(payload: {
  event: string;
  charge?: { correlationID: string; status: string };
}) {
  if (
    payload.event !== 'OPENPIX:CHARGE_COMPLETED' &&
    payload.event !== 'OPENPIX:CHARGE_PARTIALLY_PAID'
  ) {
    return { ignored: true };
  }

  if (!payload.charge?.correlationID) return { ignored: true };

  const charge = await prisma.pixCharge.findUnique({
    where: { correlationId: payload.charge.correlationID },
    include: { subscription: true },
  });

  if (!charge) return { ignored: true };

  const now = new Date();

  // Marcar cobrança como paga
  await prisma.pixCharge.update({
    where: { id: charge.id },
    data: { status: 'paid', paidAt: now },
  });

  // Calcular próximo vencimento (+30 dias)
  const nextDueDate = new Date(charge.subscription.dueDate);
  nextDueDate.setDate(nextDueDate.getDate() + 30);

  // Ativar assinatura e atualizar vencimento
  await prisma.subscription.update({
    where: { id: charge.subscriptionId },
    data: {
      status: 'active',
      dueDate: nextDueDate,
    },
  });

  return { success: true, companyId: charge.subscription.companyId };
}
