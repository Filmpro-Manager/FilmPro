"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CalendarRange, Plus, Trash2, Package, AlertCircle } from "lucide-react";
import { appointmentSchema, type AppointmentInput } from "@/lib/validators";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import type { Appointment, MaterialUsage } from "@/types";
import { apiCreateAppointment, apiUpdateAppointment } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useServicesStore } from "@/store/services-store";
import { useClientsStore } from "@/store/clients-store";
import { useEmployeesStore } from "@/store/employees-store";
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
import { useProductsStore } from "@/store/products-store";

interface MaterialRow {
  id: string; // chave local p/ React key
  productId: string;
  meters: string; // string para o input, convertido no submit
}

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: Appointment | null;
}

function newRow(): MaterialRow {
  return { id: crypto.randomUUID(), productId: "", meters: "" };
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
}: AppointmentFormDialogProps) {
  const [valueDisplay, setValueDisplay] = useState("");
  const [multiDay, setMultiDay] = useState(false);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [materialErrors, setMaterialErrors] = useState<Record<string, string>>({});

  const { token } = useAuthStore();
  const { addService, updateService } = useServicesStore();
  const clients = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);
  const products = useProductsStore((s) => s.products);
  const activeEmployees = employees.filter((e) => e.active);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentInput>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { status: "scheduled", multiDay: false },
  });

  const dateStart = watch("date");
  const currentStatus = watch("status");
  const isCompleting = currentStatus === "completed";

  // ── Inicialização ao abrir ────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      const isMulti = !!appointment?.endDate;
      setMultiDay(isMulti);
      setMaterialErrors({});
      if (appointment) {
        const raw = appointment.value ?? 0;
        setValueDisplay(maskCurrency(String(Math.round(raw * 100))));
        reset({
          clientId: appointment.clientId,
          serviceType: appointment.serviceType,
          employeeId: appointment.employeeId,
          date: appointment.date,
          endDate: appointment.endDate ?? "",
          startTime: appointment.startTime ?? "",
          endTime: appointment.endTime ?? "",
          multiDay: isMulti,
          value: raw,
          notes: appointment.notes ?? "",
          status: appointment.status,
        });
        // Pré-preenche materiais caso já existam
        if (appointment.materialsUsed && appointment.materialsUsed.length > 0) {
          setMaterials(
            appointment.materialsUsed.map((m) => ({
              id: crypto.randomUUID(),
              productId: m.productId,
              meters: String(m.meters),
            }))
          );
        } else {
          setMaterials(appointment.status === "completed" ? [newRow()] : []);
        }
      } else {
        setValueDisplay("");
        setMaterials([]);
        reset({ status: "scheduled", multiDay: false });
      }
    }
  }, [open, appointment, reset]);

  // Quando status muda para "completed" e ainda não há linhas, adiciona uma
  useEffect(() => {
    if (isCompleting && materials.length === 0) {
      setMaterials([newRow()]);
    }
  }, [isCompleting]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers materiais ─────────────────────────────────────────────────────
  function addMaterial() {
    setMaterials((prev) => [...prev, newRow()]);
  }

  function removeMaterial(id: string) {
    setMaterials((prev) => prev.filter((r) => r.id !== id));
    setMaterialErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function updateMaterial(id: string, field: "productId" | "meters", value: string) {
    setMaterials((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
    setMaterialErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function validateMaterials(): boolean {
    if (!isCompleting) return true;
    const errs: Record<string, string> = {};
    for (const row of materials) {
      if (!row.productId) {
        errs[row.id] = "Selecione a película";
      } else if (!row.meters || Number(row.meters.replace(",", ".")) <= 0) {
        errs[row.id] = "Informe os metros utilizados";
      }
    }
    setMaterialErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Outros handlers ───────────────────────────────────────────────────────
  function handleMultiDayToggle(checked: boolean) {
    setMultiDay(checked);
    setValue("multiDay", checked);
    if (!checked) setValue("endDate", "");
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCurrency(e.target.value);
    setValueDisplay(masked);
    setValue("value", parseCurrency(masked), { shouldValidate: true });
  }

  async function onSubmit(data: AppointmentInput) {
    if (!validateMaterials()) return;
    if (!token) return;

    const usedMaterials: MaterialUsage[] = materials
      .filter((r) => r.productId && r.meters)
      .map((r) => {
        const product = products.find((p) => p.id === r.productId);
        return {
          productId: r.productId,
          productName: product ? `${product.brand} ${product.model}` : r.productId,
          meters: Number(r.meters.replace(",", ".")),
        };
      });

    const client = clients.find((c) => c.id === data.clientId);
    const employee = employees.find((e) => e.id === data.employeeId);
    const vehicle = client?.vehicle
      ? `${client.vehicle.brand} ${client.vehicle.model} — ${client.vehicle.plate}`
      : appointment?.vehicle ?? "";

    const payload = {
      clientId: data.clientId,
      clientName: client?.name ?? appointment?.clientName ?? "",
      vehicle,
      serviceType: data.serviceType,
      employeeId: data.employeeId,
      employeeName: employee?.name ?? appointment?.employeeName ?? "",
      date: data.date,
      endDate: data.endDate || undefined,
      startTime: data.startTime || undefined,
      endTime: data.endTime || undefined,
      value: data.value,
      notes: data.notes,
      materialsUsed: usedMaterials.length > 0 ? usedMaterials : undefined,
    };

    if (appointment) {
      const updated = await apiUpdateAppointment(appointment.id, { ...payload, status: data.status }, token);
      updateService({
        ...appointment,
        ...data,
        id: updated.id,
        clientName: updated.clientName,
        employeeName: updated.employeeName ?? "",
        vehicle: updated.vehicle ?? "",
        materialsUsed: usedMaterials,
      });
    } else {
      const created = await apiCreateAppointment(payload, token);
      addService({
        id: created.id,
        clientId: created.clientId ?? "",
        clientName: created.clientName,
        vehicle: created.vehicle ?? "",
        serviceType: created.serviceType,
        employeeId: created.employeeId ?? "",
        employeeName: created.employeeName ?? "",
        quoteId: created.quoteId ?? undefined,
        date: created.date,
        endDate: created.endDate ?? undefined,
        startTime: created.startTime ?? undefined,
        endTime: created.endTime ?? undefined,
        status: created.status as Appointment["status"],
        value: created.value,
        notes: created.notes ?? undefined,
        materialsUsed: usedMaterials,
      });
    }

    if (data.status === "completed" && usedMaterials.length > 0) {
      // TODO: baixa automática no estoque
    }

    reset();
    onOpenChange(false);
  }

  const allCatalogServices = useServiceCatalogStore((s) => s.services);
  const catalogServices = useMemo(() => allCatalogServices.filter((sv) => sv.isActive), [allCatalogServices]);

  // ── JSX ───────────────────────────────────────────────────────────────────
  const statusSelect = (id: string) => (
    <Controller
      name="status"
      control={control}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger id={id}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Agendado</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="completed">Finalizado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? "Editar Agendamento" : "Novo Agendamento"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                      {clients.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Nenhum cliente cadastrado
                        </div>
                      ) : (
                        clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))
                      )}
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
                      {catalogServices.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Nenhum serviço no catálogo
                        </div>
                      ) : (
                        catalogServices.map((svc) => (
                          <SelectItem key={svc.id} value={svc.name}>
                            <span className="flex items-center justify-between w-full gap-4">
                              <span>{svc.name}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {svc.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </span>
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Responsável */}
            <FormField label="Responsável" htmlFor="employeeId" error={errors.employeeId?.message} className="sm:col-span-2">
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger id="employeeId">
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEmployees.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Nenhum colaborador ativo
                        </div>
                      ) : (
                        activeEmployees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name} — {e.role}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Toggle multi-dia */}
            <div className="sm:col-span-2 flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
              <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
              <Label htmlFor="multiDay" className="flex-1 text-sm cursor-pointer select-none">
                Serviço dura mais de um dia
              </Label>
              <Switch id="multiDay" checked={multiDay} onCheckedChange={handleMultiDayToggle} />
            </div>

            {/* Data início */}
            <FormField label={multiDay ? "Data de Início" : "Data"} htmlFor="date" error={errors.date?.message}>
              <Input id="date" type="date" {...register("date")} />
            </FormField>

            {/* Data término ou Status */}
            {multiDay ? (
              <FormField
                label="Data de Término"
                htmlFor="endDate"
                error={(errors as Record<string, { message?: string }>).endDate?.message}
              >
                <Input id="endDate" type="date" min={dateStart || undefined} {...register("endDate")} />
              </FormField>
            ) : (
              <FormField label="Status" htmlFor="status" error={errors.status?.message}>
                {statusSelect("status")}
              </FormField>
            )}

            {multiDay && (
              <FormField label="Status" htmlFor="status-multi" error={errors.status?.message} className="sm:col-span-2">
                {statusSelect("status-multi")}
              </FormField>
            )}

            {/* Hora início / Hora fim */}
            {!multiDay && (
              <>
                <FormField label="Hora de Início" htmlFor="startTime">
                  <Input id="startTime" type="time" {...register("startTime")} />
                </FormField>
                <FormField label="Hora de Término" htmlFor="endTime">
                  <Input id="endTime" type="time" {...register("endTime")} />
                </FormField>
              </>
            )}

            {/* Valor */}
            <FormField label="Valor (R$)" htmlFor="value" error={errors.value?.message} className="sm:col-span-2">
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

            {/* Observações */}
            <FormField label="Observações" htmlFor="notes" className="sm:col-span-2">
              <Textarea id="notes" placeholder="Notas sobre o serviço..." {...register("notes")} rows={2} />
            </FormField>
          </div>

          {/* ── Materiais utilizados (só aparece ao finalizar) ──────────────── */}
          {isCompleting && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary shrink-0" />
                <p className="text-sm font-semibold">Películas Utilizadas</p>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Informe os materiais consumidos. O estoque será atualizado automaticamente.
              </p>

              {materials.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-md px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Nenhum material adicionado. Adicione as películas usadas ou deixe em branco se não houver.
                </div>
              )}

              <div className="space-y-2">
                {materials.map((row, idx) => (
                  <div key={row.id} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {/* Película */}
                      <Select
                        value={row.productId}
                        onValueChange={(v) => updateMaterial(row.id, "productId", v)}
                      >
                        <SelectTrigger className="flex-1 h-9 text-sm">
                          <SelectValue placeholder="Selecione a película" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Nenhuma película cadastrada
                            </div>
                          ) : (
                            products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.brand} {p.model}
                                <span className="text-muted-foreground ml-1">
                                  ({p.availableMeters}m disponíveis)
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      {/* Metros */}
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

                      {/* Remover */}
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

                    {/* Erro por linha */}
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
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {appointment ? "Salvar Alterações" : "Agendar Serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}