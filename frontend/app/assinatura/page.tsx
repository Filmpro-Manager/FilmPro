"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Film, CheckCircle2, AlertTriangle, XCircle, RefreshCw,
  Copy, Check, QrCode, Store, Calendar, CreditCard,
  ChevronRight, ArrowLeft, Loader2, ReceiptText,
  LogOut, Clock,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { apiGetSubscriptionInfo, apiCreatePixCharge } from "@/lib/api";
import type { SubscriptionInfo, PixCharge } from "@/types";
import { cn } from "@/lib/utils";

// ─── Formatadores ─────────────────────────────────────────────────────────────

function centsToBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMonth(ref: string) {
  const [year, month] = ref.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

// ─── Sub-componente: status badge ────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === "active" || status === "paid") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {status === "paid" ? "Pago" : "Ativa"}
      </span>
    );
  }
  if (status === "overdue" || status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20">
        <Clock className="w-3.5 h-3.5" />
        {status === "pending" ? "Aguardando pagamento" : "Inadimplente"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/20">
      <XCircle className="w-3.5 h-3.5" />
      Suspensa
    </span>
  );
}

// ─── Sub-componente: QR Code / cobrança ──────────────────────────────────────

function PixPaymentCard({
  charge,
  onGenerate,
  generating,
}: {
  charge: PixCharge | null;
  onGenerate: () => void;
  generating: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!charge?.brCode) return;
    await navigator.clipboard.writeText(charge.brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!charge) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/15 flex items-center justify-center">
          <QrCode className="w-7 h-7 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">Nenhuma cobrança ativa</p>
          <p className="text-xs text-white/40 mt-1">Gere uma cobrança PIX para pagar sua assinatura</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Gerar cobrança PIX
        </button>
      </div>
    );
  }

  const isExpired = new Date(charge.expiresAt) < new Date();

  if (isExpired || charge.status === "expired") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-600/15 flex items-center justify-center">
          <XCircle className="w-7 h-7 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/80">Cobrança expirada</p>
          <p className="text-xs text-white/40 mt-1">Gere uma nova cobrança para continuar</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-60 cursor-pointer"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Gerar nova cobrança
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-blue-500/20 bg-blue-600/5 p-6 flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
        <span className="text-xs font-medium text-white/50">Referência: {formatMonth(charge.referenceMonth)}</span>
        <StatusBadge status={charge.status} />
      </div>

      <p className="text-3xl font-bold text-white tracking-tight">
        {centsToBRL(charge.amount)}
      </p>

      {/* QR Code */}
      {charge.qrCodeImage ? (
        <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={charge.qrCodeImage}
            alt="QR Code PIX"
            className="w-52 h-52 object-contain"
          />
        </div>
      ) : (
        <div className="w-52 h-52 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <QrCode className="w-16 h-16 text-white/20" />
        </div>
      )}

      {/* Copia e cola */}
      {charge.brCode && (
        <div className="w-full space-y-2">
          <p className="text-xs text-white/40 text-center">PIX Copia e Cola</p>
          <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl p-3">
            <p className="flex-1 text-xs text-white/60 font-mono truncate">{charge.brCode}</p>
            <button
              onClick={copyCode}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Copiar"
            >
              {copied
                ? <Check className="w-4 h-4 text-emerald-400" />
                : <Copy className="w-4 h-4 text-white/50" />}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-white/30">
        Expira em {formatDate(charge.expiresAt)}
      </p>

      <button
        onClick={onGenerate}
        disabled={generating}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors cursor-pointer"
      >
        <RefreshCw className={cn("w-3 h-3", generating && "animate-spin")} />
        Gerar nova cobrança
      </button>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AssinaturaPage() {
  const { user, token, subscriptionStatus, setSubscriptionStatus, logout } = useAuthStore();
  const router = useRouter();

  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const isDelinquent = subscriptionStatus === "overdue" || subscriptionStatus === "suspended";

  const fetchInfo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiGetSubscriptionInfo(token);
      setInfo(data);
      // Sincronizar status no store
      setSubscriptionStatus(data.subscription.status);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar assinatura");
    } finally {
      setLoading(false);
    }
  }, [token, setSubscriptionStatus]);

  useEffect(() => {
    if (!token) { router.replace("/login"); return; }
    fetchInfo();
  }, [token, router, fetchInfo]);

  // Polling de 15s para detectar pagamento confirmado automaticamente
  useEffect(() => {
    if (!token || !info?.pendingCharge) return;
    const interval = setInterval(fetchInfo, 15000);
    return () => clearInterval(interval);
  }, [token, info?.pendingCharge, fetchInfo]);

  async function handleGenerate() {
    if (!token) return;
    setGenerating(true);
    try {
      await apiCreatePixCharge(token);
      await fetchInfo();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao gerar cobrança");
    } finally {
      setGenerating(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#070c1a] text-white">

      {/* Blobs de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full bg-blue-600/8 blur-[140px]" />
        <div className="absolute top-1/2 right-0 w-[400px] h-[500px] rounded-full bg-indigo-600/6 blur-[120px]" />
        <div className="absolute -bottom-20 left-1/3 w-[350px] h-[350px] rounded-full bg-blue-400/5 blur-[100px]" />
      </div>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-[#070c1a]/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/40">
            <Film className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm tracking-tight">FilmPro Manager</span>
        </div>

        <div className="flex items-center gap-3">
          {user?.storeId && !isDelinquent && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao sistema
            </button>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </header>

      <div className="relative max-w-5xl mx-auto px-4 py-10 sm:px-6">

        {/* ── Banner de inadimplência ────────────────────────────── */}
        {isDelinquent && (
          <div className="mb-8 rounded-2xl border border-red-500/25 bg-red-500/8 px-6 py-5 flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-300">Acesso bloqueado por inadimplência</p>
              <p className="text-sm text-red-400/80 mt-1">
                O pagamento da sua assinatura está em atraso. Realize o pagamento via PIX
                para reativar o acesso ao sistema imediatamente.
              </p>
            </div>
          </div>
        )}

        {/* ── Cabeçalho da página ───────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Minha Assinatura</h1>
          <p className="text-sm text-white/40 mt-1">
            Gerencie o pagamento mensal do FilmPro Manager
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-8 text-center">
            <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="font-semibold text-white/80">{error}</p>
            <button
              onClick={fetchInfo}
              className="mt-4 px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] text-sm text-white/70 transition-colors cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : info ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Coluna principal (2/3) ────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Card status da assinatura */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1">Status da assinatura</p>
                    <StatusBadge status={info.subscription.status} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-1">Próximo vencimento</p>
                    <p className="text-sm font-semibold text-white/80">
                      {formatDate(info.subscription.dueDate)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-white/40">Lojas ativas</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{info.storeCount}</p>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-white/40">Por loja / mês</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {centsToBRL(info.subscription.pricePerStore)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white/[0.04] p-4 sm:col-span-1 col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-white/40">Cobrança mensal</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {centsToBRL(info.monthlyAmount)}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-white/30 mt-4">
                  Cálculo: {info.storeCount} loja{info.storeCount !== 1 ? "s" : ""} × {centsToBRL(info.subscription.pricePerStore)}/mês = {centsToBRL(info.monthlyAmount)}/mês
                </p>
              </div>

              {/* Histórico de pagamentos */}
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className="flex items-center gap-2 mb-5">
                  <ReceiptText className="w-4 h-4 text-white/50" />
                  <h2 className="text-sm font-semibold text-white/80">Histórico de pagamentos</h2>
                </div>

                {info.charges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <ReceiptText className="w-10 h-10 text-white/10" />
                    <p className="text-sm text-white/30">Nenhum histórico disponível</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {info.charges.map((charge) => (
                      <div
                        key={charge.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                            charge.status === "paid"
                              ? "bg-emerald-500/15"
                              : charge.status === "expired"
                                ? "bg-red-500/15"
                                : "bg-amber-500/15",
                          )}>
                            {charge.status === "paid"
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              : charge.status === "expired"
                                ? <XCircle className="w-4 h-4 text-red-400" />
                                : <Clock className="w-4 h-4 text-amber-400" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white/80 capitalize">
                              {formatMonth(charge.referenceMonth)}
                            </p>
                            <p className="text-xs text-white/30">
                              {charge.storeCount} loja{charge.storeCount !== 1 ? "s" : ""}
                              {charge.paidAt && ` · Pago em ${formatDate(charge.paidAt)}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white/80">
                            {centsToBRL(charge.amount)}
                          </p>
                          <StatusBadge status={charge.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Sidebar: cobrança PIX (1/3) ───────────────────── */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Pagar via PIX
              </h2>
              <PixPaymentCard
                charge={info.pendingCharge}
                onGenerate={handleGenerate}
                generating={generating}
              />

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
                <p className="text-xs font-medium text-white/40 uppercase tracking-wider">Como funciona</p>
                {[
                  { icon: QrCode, text: "Clique em \"Gerar cobrança PIX\" para criar sua fatura mensal" },
                  { icon: Copy, text: "Escaneie o QR Code ou copie o código PIX no seu banco" },
                  { icon: CheckCircle2, text: "O acesso é liberado automaticamente após a confirmação" },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-0.5">
                      <step.icon className="w-3 h-3 text-blue-400" />
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed">{step.text}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={fetchInfo}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-sm text-white/40 hover:text-white/70 hover:border-white/[0.15] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Verificar status do pagamento
              </button>

              {/* Info empresa */}
              {info.company && (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <p className="text-xs text-white/40 mb-2">Conta</p>
                  <p className="text-sm font-medium text-white/80">{info.company.name}</p>
                  <p className="text-xs text-white/40">{info.company.email}</p>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
}
