"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2, Plus, Trash2, Package, AlertCircle, Zap,
} from "lucide-react";
import { quickServiceSchema, type QuickServiceInput } from "@/lib/validators";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import type { MaterialUsage } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { useServicesStore } from "@/store/services-store";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useClientsStore } from "@/store/clients-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useProductsStore } from "@/store/products-store";
import { toast } from "sonner";

const PAYMENT_METHODS = [
  "PIX",
  "Dinheiro",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Transferência",
  "Boleto",
];

interface MaterialRow {
  id: string;
  productId: string;
  meters: string;
}

function newRow(): MaterialRow {
  return { id: crypto.randomUUID(), productId: "", meters: "" };
}

interface QuickServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickServiceDialog({ open, onOpenChange }: QuickServiceDialogProps) {
  const [valueDisplay, setValueDisplay] = useState("");
  const [materials, setMaterials] = useState<MaterialRow[]>([newRow()]);
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});

  const allCatalogServices = useServiceCatalogStore((s) => s.services);
  const catalogServices = useMemo(() => allCatalogServices.filter((sv) => sv.isActive), [allCatalogServices]);

  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<QuickServiceInput>({
    resolver: zodResolver(quickServiceSchema),
    defaultValues: {
      date: today,
      paid: true,
    },
  });

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setValueDisplay("");
      setMaterials([newRow()]);
      setMaterialErrors({});
      reset({ date: today, paid: true });
    }
  }, [open, reset, today]);

  // ── Materiais ─────────────────────────────────────────────────────────────
  function addMaterial() {
    setMaterials((prev) => [...prev, newRow()]);
  }

  function removeMaterial(id: string) {
    setMaterials((prev) => prev.filter((r) => r.id !== id));
    setMaterialErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function updateMaterial(id: string, field: "productId" | "meters", value: string) {
    setMaterials((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setMaterialErrors((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function validateMaterials(): boolean {
    const errs: Record<string, string> = {};
    for (const row of materials) {
      if (!row.productId && !row.meters) continue; // linha vazia ignorada
      if (row.productId && !row.meters) {
        errs[row.id] = "Informe os metros utilizados";
      } else if (!row.productId && row.meters) {
        errs[row.id] = "Selecione a película";
      } else if (row.productId && Number(row.meters.replace(",", ".")) <= 0) {
        errs[row.id] = "Metros deve ser maior que zero";
      }
    }
    setMaterialErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Valor ──────────────────────────────────────────────────────────────────
  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCurrency(e.target.value);
    setValueDisplay(masked);
    setValue("value", parseCurrency(masked), { shouldValidate: true });
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const addService = useServicesStore((s) => s.addService);
  const clients = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);
  const products = useProductsStore((s) => s.products);
  const activeEmployees = employees.filter((e) => e.active);

  async function onSubmit(data: QuickServiceInput) {
    if (!validateMaterials()) return;

    const usedMaterials: MaterialUsage[] = materials
      .filter((r) => r.productId && r.meters && Number(r.meters.replace(",", ".")) > 0)
      .map((r) => {
        const product = products.find((p) => p.id === r.productId);
        return {
          productId: r.productId,
          productName: product ? `${product.brand} ${product.model}` : r.productId,
          meters: Number(r.meters.replace(",", ".")),
        };
      });

    await new Promise((res) => setTimeout(res, 700));

    const client = clients.find((c) => c.id === data.clientId);
    const employee = employees.find((e) => e.id === data.employeeId);

    addService({
      id: crypto.randomUUID(),
      clientId: data.clientId,
      clientName: client?.name ?? data.clientId,
      vehicle: client?.vehicle
        ? `${client.vehicle.brand} ${client.vehicle.model} • ${client.vehicle.plate}`
        : "—",
      serviceType: data.serviceType,
      employeeId: data.employeeId,
      employeeName: employee?.name ?? data.employeeId,
      date: data.date,
      status: "completed",
      value: data.value,
      paymentMethod: data.paymentMethod,
      paid: data.paid,
      notes: data.notes,
      materialsUsed: usedMaterials,
    });

    if (usedMaterials.length > 0) {
      // TODO: baixa automática no estoque
    }

    toast.success("Serviço lançado com sucesso!", {
      description: `${data.serviceType} — ${data.paid ? "Pago" : "Pendente"}`,
    });

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <DialogTitle>Lançamento Rápido de Serviço</DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground pt-1">
            Registre um serviço realizado sem precisar de agendamento prévio.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Cliente */}
            <FormField label="Cliente" htmlFor="clientId" error={errors.clientId?.message} className="sm:col-span-2">
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="clientId">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.vehicle ? ` — ${c.vehicle.plate}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Tipo de Serviço */}
            <FormField label="Tipo de Serviço" htmlFor="serviceType" error={errors.serviceType?.message} className="sm:col-span-2">
              <Controller
                name="serviceType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(name) => {
                      field.onChange(name);
                      const svc = catalogServices.find((s) => s.name === name);
                      if (svc) {
                        const masked = svc.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
                        setValueDisplay(masked);
                        setValue("value", svc.price, { shouldValidate: true });
                      }
                    }}
                  >
                    <SelectTrigger id="serviceType">
                      <SelectValue placeholder="Selecione o tipo de serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalogServices.map((svc) => (
                        <SelectItem key={svc.id} value={svc.name}>
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{svc.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {svc.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Responsável */}
            <FormField label="Responsável" htmlFor="employeeId" error={errors.employeeId?.message}>
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="employeeId">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Data */}
            <FormField label="Data do Serviço" htmlFor="date" error={errors.date?.message}>
              <Input id="date" type="date" {...register("date")} />
            </FormField>

            {/* Valor */}
            <FormField label="Valor (R$)" htmlFor="value" error={errors.value?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  R$
                </span>
                <Input
                  id="value"
                  inputMode="numeric"
                  placeholder="0,00"
                  className="pl-9"
                  value={valueDisplay}
                  onChange={handleValueChange}
                />
              </div>
            </FormField>

            {/* Método de pagamento */}
            <FormField label="Método de Pagamento" htmlFor="paymentMethod" error={errors.paymentMethod?.message}>
              <Controller
                name="paymentMethod"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue placeholder="Selecione" />
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

            {/* Pago? */}
            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <div className="flex-1">
                <Label htmlFor="paid" className="text-sm font-medium cursor-pointer select-none">
                  Pagamento recebido
                </Label>
                <p className="text-xs text-muted-foreground">
                  Desative se o cliente ainda não pagou
                </p>
              </div>
              <Controller
                name="paid"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="paid"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Observações */}
            <FormField label="Observações" htmlFor="notes" className="sm:col-span-2">
              <Textarea
                id="notes"
                placeholder="Détalhes adicionais sobre o serviço..."
                {...register("notes")}
                rows={2}
              />
            </FormField>
          </div>

          {/* ── Materiais utilizados ─────────────────────────────────────── */}
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-primary shrink-0" />
              <p className="text-sm font-semibold">Películas Utilizadas</p>
              <span className="text-xs text-muted-foreground ml-auto">Opcional</span>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Informe os materiais consumidos. O estoque será baixado automaticamente.
            </p>

            {materials.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Nenhum material adicionado.
              </div>
            )}

            <div className="space-y-2">
              {materials.map((row, idx) => (
                <div key={row.id} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Select
                      value={row.productId}
                      onValueChange={(v) => updateMaterial(row.id, "productId", v)}
                    >
                      <SelectTrigger className="flex-1 h-9 text-sm">
                        <SelectValue placeholder="Selecione a película" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.brand} {p.model}
                            <span className="text-muted-foreground ml-1">
                              ({p.availableMeters}m disponíveis)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="relative w-28 shrink-0">
                      <Input
                        className="h-9 pr-7 text-sm"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={row.meters}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9.,]/g, "");
                          updateMaterial(row.id, "meters", v);
                        }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                        m
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMaterial(row.id)}
                      aria-label={`Remover material ${idx + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {materialErrors[row.id] && (
                    <p className="text-xs text-destructive pl-1">{materialErrors[row.id]}</p>
                  )}
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs h-8"
              onClick={addMaterial}
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar material
            </Button>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Zap className="h-4 w-4" />
              }
              Lançar Serviço
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
