"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileDown,
  MessageCircle,
  SquarePen,
  ArrowRightCircle,
  Mail,
  Car,
  Home,
  Building2,
  Package,
  CreditCard,
  FileText,
  X,
  Phone,
  MapPin,
  SendHorizonal,
  CheckCircle2,
} from "lucide-react";
import type { Quote, QuoteStatus } from "@/types";
import { useCompanyStore } from "@/store/company-store";
import { maskCurrency } from "@/lib/masks";
import { generateQuotePDF, shareQuoteWhatsApp } from "./quote-pdf";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Gerado",
  sent:  "Enviado",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  sent:  "bg-green-100 text-green-700 border-green-300",
};

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function fmt(val: number): string {
  return maskCurrency(String(Math.round(val * 100)));
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface QuoteDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote | null;
  onEdit?: (quote: Quote) => void;
  onConvert?: (quote: Quote) => void;
  onStatusChange?: (id: string, status: QuoteStatus) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function QuoteDetailDialog({
  open,
  onOpenChange,
  quote,
  onEdit,
  onConvert,
  onStatusChange,
}: QuoteDetailDialogProps) {
  const { settings: company } = useCompanyStore();
  const [confirmSent, setConfirmSent] = useState(false);

  if (!quote) return null;

  const globalDiscVal =
    quote.discountType === "percent"
      ? quote.subtotal * (quote.discount / 100)
      : quote.discount;

  const taxVal = quote.taxes ? quote.totalValue * (quote.taxes / 100) : 0;

  const acceptedPaymentMethods: string[] =
    (quote as unknown as { acceptedPaymentMethods?: string[] })
      .acceptedPaymentMethods ?? [];

  function handleWhatsApp() {
    if (company) shareQuoteWhatsApp(quote!, company);
    else {
      const msg = encodeURIComponent(
        `Olá ${quote!.clientName}! Segue o orçamento *${quote!.number}* no valor de *${fmt(quote!.totalValue)}*.`
      );
      window.open(`https://wa.me/?text=${msg}`, "_blank");
    }
  }

  function handleEmail() {
    const subject = encodeURIComponent(`Orçamento ${quote!.number}`);
    const body = encodeURIComponent(
      `Olá ${quote!.clientName},\n\nSegue em anexo o orçamento ${quote!.number} no valor de ${fmt(quote!.totalValue)}.\n\nAtenciosamente,\n${company?.tradeName ?? ""}`
    );
    window.location.href = `mailto:${quote!.clientEmail ?? ""}?subject=${subject}&body=${body}`;
  }

  const sub = quote.subject;
  const isVehicle = sub?.type === "vehicle";
  const isResidence = sub?.type === "residence";
  const isCommercial = sub?.type === "commercial";
  const SubIcon = isVehicle ? Car : isResidence ? Home : isCommercial ? Building2 : Package;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-3xl w-[calc(100%-2rem)] sm:w-full h-[90vh] p-0 gap-0 rounded-2xl overflow-hidden [&>button:last-of-type]:hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-lg font-semibold truncate">{quote.number}</DialogTitle>
                <Badge
                  variant="outline"
                  className={cn("text-xs px-2.5 py-0.5 shrink-0", STATUS_CLASSES[quote.status])}
                >
                  {STATUS_LABELS[quote.status]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Emissão {fmtDate(quote.issueDate)}
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => company && generateQuotePDF(quote!, company)}
            >
              <FileDown className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>

            {quote.clientPhone && quote.status !== "sent" && (
              <Button size="sm" variant="outline" onClick={handleWhatsApp}>
                <MessageCircle className="h-3.5 w-3.5 mr-1.5 text-green-600" /> WhatsApp
              </Button>
            )}

            {quote.clientEmail && quote.status !== "sent" && (
              <Button size="sm" variant="outline" onClick={handleEmail}>
                <Mail className="h-3.5 w-3.5 mr-1.5" /> E-mail
              </Button>
            )}

            {onConvert && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onConvert(quote!); onOpenChange(false); }}
              >
                <ArrowRightCircle className="h-3.5 w-3.5 mr-1.5" /> OS
              </Button>
            )}

            {onEdit && quote.status !== "sent" && (
              <Button
                size="sm"
                onClick={() => { onEdit(quote!); onOpenChange(false); }}
              >
                <SquarePen className="h-3.5 w-3.5 mr-1.5" /> Editar
              </Button>
            )}

            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-8">

            {/* ── 1. Cliente ── */}
            <section>
              <SectionTitle>Cliente</SectionTitle>

              <div className="rounded-xl border bg-muted/30 p-4 space-y-2">
                <p className="font-semibold text-base">{quote.clientName}</p>
                {quote.clientPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {quote.clientPhone}
                  </div>
                )}
                {quote.clientEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {quote.clientEmail}
                  </div>
                )}
              </div>

              {/* Veículo / local */}
              {sub && (
                <div
                  className={cn(
                    "mt-3 flex flex-wrap items-center gap-3 text-sm border-2 rounded-xl px-4 py-3",
                    isVehicle
                      ? "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300"
                      : isResidence
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                      : isCommercial
                      ? "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300"
                      : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                  )}
                >
                  <SubIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isVehicle
                        ? "text-sky-600"
                        : isResidence
                        ? "text-emerald-600"
                        : isCommercial
                        ? "text-violet-600"
                        : "text-amber-600"
                    )}
                  />
                  {isVehicle && (
                    <>
                      <span className="font-medium">
                        {[sub.brand, sub.model, sub.year].filter(Boolean).join(" ")}
                      </span>
                      {sub.plate && (
                        <span className="font-mono bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-200 px-2 py-0.5 rounded text-xs">
                          {sub.plate}
                        </span>
                      )}
                      {sub.color && <span className="opacity-70">{sub.color}</span>}
                    </>
                  )}
                  {(isResidence || isCommercial) && (
                    <>
                      {sub.address && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {sub.address}
                        </span>
                      )}
                      {sub.area && <span className="opacity-70">{sub.area} m²</span>}
                      {sub.description && <span className="opacity-70">{sub.description}</span>}
                    </>
                  )}
                  {sub.type === "other" && (
                    <span className="font-medium">{sub.description ?? "Outro"}</span>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* ── 2. Itens ── */}
            <section>
              <SectionTitle>Itens do Orçamento ({quote.items.length})</SectionTitle>

              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left px-3 py-2.5">Item</th>
                      <th className="text-center px-3 py-2.5 w-20">Qtd</th>
                      <th className="text-right px-3 py-2.5 w-24">Unit.</th>
                      <th className="text-right px-3 py-2.5 w-20">Desc.</th>
                      <th className="text-right px-3 py-2.5 w-24">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quote.items.map((item, idx) => {
                      const gross = item.unitPrice * item.quantity;
                      const discAmt =
                        item.discountType === "percent"
                          ? gross * (item.discount / 100)
                          : item.discount;
                      const total = gross - discAmt;
                      return (
                        <tr
                          key={item.id ?? idx}
                          className={cn(
                            "border-t",
                            idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <p className="font-medium">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.description}
                              </p>
                            )}
                            <Badge
                              variant="outline"
                              className="mt-1 text-[10px] px-1.5 py-0 h-4 capitalize"
                            >
                              {item.type === "service"
                                ? "Serviço"
                                : item.type === "product"
                                ? "Película"
                                : "Outro"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-3 py-2.5 text-right">{fmt(item.unitPrice)}</td>
                          <td className="px-3 py-2.5 text-right">
                            {item.discount > 0
                              ? item.discountType === "percent"
                                ? `${item.discount}%`
                                : fmt(item.discount)
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            {fmt(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <Separator />

            {/* ── 3. Totais ── */}
            <section>
              <SectionTitle>Totais</SectionTitle>
              <div>
                <div className="w-full">
                  {/* Linhas de valores */}
                  <div className="rounded-xl border bg-muted/20 divide-y overflow-hidden mb-3">
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">{fmt(quote.subtotal)}</span>
                    </div>
                    {globalDiscVal > 0 && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">
                          Desconto{quote.discountType === "percent" ? ` (${quote.discount}%)` : ""}
                        </span>
                        <span className="font-medium text-red-500 tabular-nums">-{fmt(globalDiscVal)}</span>
                      </div>
                    )}
                    {taxVal > 0 && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">Impostos ({quote.taxes}%)</span>
                        <span className="font-medium tabular-nums">{fmt(taxVal)}</span>
                      </div>
                    )}
                  </div>
                  {/* Total destacado */}
                  <div className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</span>
                    <span className="text-2xl font-bold tabular-nums">{fmt(quote.totalValue)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 4. Formas de pagamento ── */}
            {acceptedPaymentMethods.length > 0 && (
              <>
                <Separator />
                <section>
                  <SectionTitle>Formas de Pagamento Aceitas</SectionTitle>
                  <div className="flex flex-wrap gap-2">
                    {acceptedPaymentMethods.map((method) => (
                      <div
                        key={method}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-slate-200 bg-slate-50 dark:bg-slate-800/30 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                        {method}
                      </div>
                    ))}
                  </div>
                  {quote.payment?.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {quote.payment.notes}
                    </p>
                  )}
                </section>
              </>
            )}

            {/* ── 5. Observações ── */}
            {(quote.notes || quote.internalNotes) && (
              <>
                <Separator />
                <section>
                  <SectionTitle>Observações</SectionTitle>
                  {quote.notes && (
                    <div className="rounded-xl border bg-muted/30 p-4 text-sm whitespace-pre-wrap mb-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Para o cliente
                      </p>
                      {quote.notes}
                    </div>
                  )}
                  {quote.internalNotes && (
                    <div className="rounded-xl border border-dashed bg-muted/10 p-4 text-sm whitespace-pre-wrap text-muted-foreground">
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Notas internas
                      </p>
                      {quote.internalNotes}
                    </div>
                  )}
                </section>
              </>
            )}


          </div>
        </div>

        {/* ── Footer fixo: confirmar envio ── */}
        {onStatusChange && quote.status === "draft" && (
          <div className="shrink-0 border-t bg-background px-6 py-3">
            {!confirmSent ? (
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Orçamento ainda não enviado ao cliente.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  onClick={() => setConfirmSent(true)}
                >
                  <SendHorizonal className="h-3.5 w-3.5" />
                  Marcar como Enviado
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                  Confirmar envio ao cliente?
                </p>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmSent(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => { onStatusChange(quote!.id, "sent"); setConfirmSent(false); }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}
