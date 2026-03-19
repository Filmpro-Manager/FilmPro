"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { formatCurrency } from "@/lib/utils";
import { apiCompleteServiceOrder } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useServicesStore } from "@/store/services-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { toast } from "sonner";
import type { Appointment } from "@/types";

const PAYMENT_METHODS = [
  "PIX",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
  "Boleto",
];

const schema = z.object({
  paymentMethod: z.string().min(1, "Selecione a forma de pagamento"),
  isPaid: z.boolean(),
  paidDate: z.string().optional(),
  installments: z.number().int().min(1).max(48).optional(),
});

type FormData = z.infer<typeof schema>;

interface CompleteServiceOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceOrder: Appointment | null;
}

export function CompleteServiceOrderDialog({
  open,
  onOpenChange,
  serviceOrder,
}: CompleteServiceOrderDialogProps) {
  const { token } = useAuthStore();
  const updateStatus = useServicesStore((s) => s.updateStatus);
  const addTransaction = useTransactionsStore((s) => s.addTransaction);
  const [showInstallments, setShowInstallments] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isPaid: true,
      paidDate: today,
      installments: 1,
    },
  });

  const paymentMethod = watch("paymentMethod");
  const isPaid = watch("isPaid");

  useEffect(() => {
    if (open) {
      reset({ isPaid: true, paidDate: today, installments: 1 });
      setShowInstallments(false);
    }
  }, [open, reset, today]);

  // Só Cartão de Crédito admite parcelamento
  useEffect(() => {
    if (paymentMethod !== "Cartão de Crédito") {
      setShowInstallments(false);
    }
  }, [paymentMethod]);

  async function onSubmit(data: FormData) {
    if (!token || !serviceOrder) return;
    try {
      const updated = await apiCompleteServiceOrder(serviceOrder.id, {
        paymentMethod: data.paymentMethod,
        isPaid: data.isPaid,
        paidDate: data.isPaid ? data.paidDate : undefined,
        installments: showInstallments ? data.installments : undefined,
      }, token);

      updateStatus(serviceOrder.id, "completed");

      // Adiciona transação fictícia no store local p/ refletir sem reload
      const installments = showInstallments ? (data.installments ?? 1) : 1;
      const installmentValue = Number((serviceOrder.value / installments).toFixed(2));
      for (let i = 1; i <= installments; i++) {
        addTransaction({
          id: `${updated.id}-txn-${i}`,
          type: "income",
          description: `${serviceOrder.serviceType} – ${serviceOrder.clientName}${installments > 1 ? ` (${i}/${installments})` : ""}`,
          amount: installmentValue,
          date: today,
          isPaid: i === 1 ? data.isPaid : false,
          paidDate: i === 1 && data.isPaid ? (data.paidDate ?? today) : undefined,
          paidAmount: i === 1 && data.isPaid ? installmentValue : undefined,
          category: "Serviços",
          paymentMethod: data.paymentMethod,
          clientId: serviceOrder.clientId,
          clientName: serviceOrder.clientName,
          ...(installments > 1 && { installments, installmentNum: i }),
        });
      }

      toast.success("OS finalizada!", {
        description: `${data.paymentMethod}${installments > 1 ? ` em ${installments}x` : ""} — ${data.isPaid ? "Pago" : "Pendente"}`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao finalizar OS");
    }
  }

  if (!serviceOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <DialogTitle>Finalizar Ordem de Serviço</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            {serviceOrder.clientName} — {serviceOrder.serviceType}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Valor */}
          <div className="rounded-lg bg-muted/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Valor da OS</span>
            <span className="text-lg font-bold">{formatCurrency(serviceOrder.value)}</span>
          </div>

          {/* Forma de pagamento */}
          <FormField label="Forma de pagamento" htmlFor="paymentMethod" error={errors.paymentMethod?.message}>
            <Controller
              name="paymentMethod"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Parcelamento — só para Cartão de Crédito */}
          {paymentMethod === "Cartão de Crédito" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="showInstallments" className="text-sm">Parcelado?</Label>
                <Switch
                  id="showInstallments"
                  checked={showInstallments}
                  onCheckedChange={setShowInstallments}
                />
              </div>

              {showInstallments && (
                <FormField label="Número de parcelas" htmlFor="installments" error={errors.installments?.message}>
                  <Input
                    id="installments"
                    type="number"
                    min={2}
                    max={48}
                    placeholder="Ex: 3"
                    {...register("installments", { valueAsNumber: true })}
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Já pagou? */}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="isPaid" className="text-sm">Já foi pago?</Label>
              <p className="text-xs text-muted-foreground">
                {isPaid ? "Pagamento confirmado" : "Registrar como pendente"}
              </p>
            </div>
            <Controller
              name="isPaid"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isPaid"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Data de pagamento */}
          {isPaid && (
            <FormField label="Data do pagamento" htmlFor="paidDate">
              <Input
                id="paidDate"
                type="date"
                {...register("paidDate")}
              />
            </FormField>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Finalizar OS
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
