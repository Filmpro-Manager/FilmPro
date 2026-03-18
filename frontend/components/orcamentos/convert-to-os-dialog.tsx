"use client";

import { useState } from "react";
import { Loader2, CalendarRange, Clock, User, FileText, CheckCircle2 } from "lucide-react";
import type { Quote, Appointment } from "@/types";
import type { ApiServiceOrder } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/store/auth-store";
import { useServicesStore } from "@/store/services-store";
import { useQuotesStore } from "@/store/quotes-store";
import { apiCreateServiceOrder } from "@/lib/api";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapApiToAppointment(api: ApiServiceOrder): Appointment {
  return {
    id: api.id,
    clientId: api.clientId ?? "",
    clientName: api.clientName,
    vehicle: api.vehicle ?? "—",
    serviceType: api.serviceType,
    employeeId: api.employeeId ?? "",
    employeeName: api.employeeName ?? "",
    quoteId: api.quoteId ?? undefined,
    date: api.date,
    endDate: api.endDate ?? undefined,
    startTime: api.startTime ?? undefined,
    endTime: api.endTime ?? undefined,
    status: api.status as Appointment["status"],
    value: api.value,
    notes: api.notes ?? undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildVehicleString(quote: Quote): string {
  const sub = quote.subject;
  if (!sub) return "—";
  if (sub.type === "vehicle") {
    const parts = [sub.brand, sub.model, sub.year].filter(Boolean).join(" ");
    return sub.plate ? `${parts} – ${sub.plate}` : parts || "—";
  }
  if (sub.address) return sub.address;
  if (sub.description) return sub.description;
  return "—";
}

function buildServiceType(quote: Quote): string {
  return (
    quote.items.find((i) => i.type === "service")?.name ??
    quote.items[0]?.name ??
    "Serviço"
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConvertToOSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConvertToOSDialog({
  open,
  onOpenChange,
  quote,
  onSuccess,
}: ConvertToOSDialogProps) {
  const today = new Date().toISOString().slice(0, 10);

  const { token } = useAuthStore();
  const { addService } = useServicesStore();
  const { convertToAppointment } = useQuotesStore();

  const [date, setDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [notes, setNotes] = useState(quote.notes ?? "");
  const [dateError, setDateError] = useState("");
  const [loading, setLoading] = useState(false);

  const vehicleStr  = buildVehicleString(quote);
  const serviceType = buildServiceType(quote);

  async function handleSubmit() {
    setDateError("");
    if (!date) { setDateError("Informe a data do serviço"); return; }
    if (!token) return;

    setLoading(true);
    try {
      const apiOS = await apiCreateServiceOrder(
        {
          quoteId:      quote.id,
          clientId:     quote.clientId || undefined,
          clientName:   quote.clientName,
          vehicle:      vehicleStr !== "—" ? vehicleStr : undefined,
          subject:      quote.subject ?? undefined,
          serviceType,
          employeeName: employeeName.trim() || undefined,
          date,
          startTime:    startTime || undefined,
          endTime:      endTime   || undefined,
          value:        quote.totalValue,
          items:        quote.items,
          notes:        notes.trim() || undefined,
        },
        token,
      );

      const appointment = mapApiToAppointment(apiOS);
      addService(appointment);
      convertToAppointment(quote.id, appointment.id);

      toast.success("Ordem de Serviço criada!", {
        description: `${apiOS.number} foi adicionada à agenda.`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar OS");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    setDateError("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg w-[calc(100%-2rem)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-5 w-5 text-primary shrink-0" />
            Converter em Ordem de Serviço
          </DialogTitle>
        </DialogHeader>

        {/* Resumo do orçamento */}
        <div className="rounded-xl border bg-muted/40 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Orçamento {quote.number}
          </p>
          <p className="font-semibold">{quote.clientName}</p>
          {vehicleStr !== "—" && (
            <p className="text-sm text-muted-foreground">{vehicleStr}</p>
          )}
          <p className="text-sm font-medium text-primary pt-1">
            {formatCurrency(quote.totalValue)}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quote.items.map((it) => (
              <span
                key={it.id}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border",
                  it.type === "service"
                    ? "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800"
                    : "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800",
                )}
              >
                {it.name}
              </span>
            ))}
          </div>
        </div>

        <Separator />

        {/* Formulário */}
        <div className="space-y-4">
          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="os-date" className="flex items-center gap-1.5 text-sm font-medium">
              <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
              Data do serviço
              <span className="text-destructive">*</span>
            </Label>
            <Input
              id="os-date"
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setDateError(""); }}
              className={cn(dateError && "border-destructive focus-visible:ring-destructive")}
            />
            {dateError && (
              <p className="text-xs text-destructive">{dateError}</p>
            )}
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="os-start" className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Início
              </Label>
              <Input
                id="os-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="os-end" className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Término
              </Label>
              <Input
                id="os-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Técnico */}
          <div className="space-y-1.5">
            <Label htmlFor="os-employee" className="flex items-center gap-1.5 text-sm">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Técnico responsável
            </Label>
            <Input
              id="os-employee"
              placeholder="Nome do técnico (opcional)"
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="os-notes" className="flex items-center gap-1.5 text-sm">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Observações
            </Label>
            <Textarea
              id="os-notes"
              placeholder="Instruções, detalhes, itens especiais…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {loading ? "Criando…" : "Converter em OS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
