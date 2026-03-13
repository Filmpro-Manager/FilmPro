"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft, ClipboardList, User, Car, Landmark,
  CalendarDays, DollarSign, FileText, UserCheck, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/shared/form-field";
import { useServicesStore } from "@/store/services-store";
import { useClientsStore } from "@/store/clients-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useQuotesStore } from "@/store/quotes-store";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Appointment } from "@/types";

// ─── Schema do formulário ────────────────────────────────────────────────────

const novaOsSchema = z.object({
  serviceType: z.string().min(1, "Tipo de serviço obrigatório"),
  employeeId:  z.string().min(1, "Selecione um responsável"),
  date:        z.string().min(1, "Data obrigatória"),
  value:       z.number().min(0, "Valor inválido"),
  notes:       z.string().optional(),
});

type NovaOsInput = z.infer<typeof novaOsSchema>;

// ─── Conteúdo principal ──────────────────────────────────────────────────────

function NovaOSContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const osId = searchParams.get("id");

  const { services, updateService } = useServicesStore();
  const clients = useClientsStore((s) => s.clients);
  const employees = useEmployeesStore((s) => s.employees);
  const catalog = useServiceCatalogStore((s) => s.services);
  const quotes = useQuotesStore((s) => s.quotes);

  const appointment = services.find((s) => s.id === osId) ?? null;
  const client = clients.find((c) => c.id === appointment?.clientId) ?? null;
  const sourceQuote = quotes.find((q) => q.convertedToAppointmentId === osId) ?? null;

  const activeEmployees = employees.filter((e) => e.active);
  const [valueDisplay, setValueDisplay] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NovaOsInput>({
    resolver: zodResolver(novaOsSchema),
    defaultValues: {
      serviceType: appointment?.serviceType ?? "",
      employeeId:  appointment?.employeeId ?? "",
      date:        appointment?.date ?? new Date().toISOString().slice(0, 10),
      value:       appointment?.value ?? 0,
      notes:       appointment?.notes ?? "",
    },
  });

  // Inicializa o display de valor formatado
  useEffect(() => {
    if (appointment?.value) {
      setValueDisplay(maskCurrency(String(Math.round(appointment.value * 100))));
    }
  }, [appointment?.value]);

  // Redireciona se o id não for encontrado ou a OS não for rascunho
  useEffect(() => {
    if (!osId) {
      router.replace("/ordens-de-servico");
      return;
    }
    if (appointment && appointment.status !== "draft") {
      router.replace("/ordens-de-servico");
    }
  }, [osId, appointment, router]);

  function onSubmit(data: NovaOsInput) {
    if (!appointment) return;

    const employee = activeEmployees.find((e) => e.id === data.employeeId);

    const updated: Appointment = {
      ...appointment,
      serviceType:  data.serviceType,
      employeeId:   data.employeeId,
      employeeName: employee?.name ?? "",
      date:         data.date,
      value:        data.value,
      notes:        data.notes ?? "",
      status:       "created",
    };

    updateService(updated);
    router.push("/ordens-de-servico");
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Ordem de serviço não encontrada.</p>
        <Button variant="outline" onClick={() => router.push("/ordens-de-servico")}>
          Voltar
        </Button>
      </div>
    );
  }

  const isVehicle = appointment.vehicle && appointment.vehicle !== "—" &&
    !appointment.vehicle.includes(",") && !appointment.vehicle.match(/rua|av\.|avenida/i);

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/ordens-de-servico")}
          className="shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-violet-500" />
            Completar Ordem de Serviço
          </h1>
          <p className="text-sm text-muted-foreground">
            Preencha os dados obrigatórios para criar a OS
          </p>
        </div>
      </div>

      {/* ── Banner de aviso ────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="text-sm text-amber-700 dark:text-amber-300">
          <span className="font-medium">OS em rascunho. </span>
          Esta ordem foi gerada a partir do{" "}
          {sourceQuote ? (
            <span className="font-medium">orçamento #{sourceQuote.id.replace("q-", "")}</span>
          ) : (
            "orçamento aprovado"
          )}
          . Preencha os dados abaixo para criar a OS oficialmente.
        </div>
      </div>

      {/* ── Dados já preenchidos (read-only) ─────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Dados do orçamento
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cliente */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{appointment.clientName}</p>
              {client?.phone && (
                <p className="text-xs text-muted-foreground">{client.phone}</p>
              )}
            </div>
          </div>

          {/* Objeto do serviço */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              {isVehicle
                ? <Car className="w-4 h-4 text-muted-foreground" />
                : <Landmark className="w-4 h-4 text-muted-foreground" />
              }
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {isVehicle ? "Veículo" : "Local / Endereço"}
              </p>
              <p className="text-sm font-medium">{appointment.vehicle || "—"}</p>
            </div>
          </div>

          {/* Valor do orçamento */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valor do orçamento</p>
              <p className="text-sm font-semibold text-emerald-600">
                {formatCurrency(appointment.value)}
              </p>
            </div>
          </div>

          {/* ID da OS */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nº da OS</p>
              <p className="text-sm font-medium font-mono">
                {appointment.id.replace("svc-", "#")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Formulário de conclusão ──────────────────────────────────────── */}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Dados obrigatórios da OS
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">

            {/* Responsável (OBRIGATÓRIO) */}
            <FormField
              label="Responsável pelo serviço"
              error={errors.employeeId?.message}
              required
            >
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.employeeId ? "border-destructive" : ""}>
                      <UserCheck className="w-3.5 h-3.5 text-muted-foreground mr-2" />
                      <SelectValue placeholder="Selecione o técnico responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeEmployees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name}
                          <span className="text-muted-foreground text-xs ml-1">
                            — {emp.role}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Data de execução (OBRIGATÓRIO) */}
            <FormField
              label="Data de execução"
              error={errors.date?.message}
              required
            >
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  type="date"
                  className={`pl-9 ${errors.date ? "border-destructive" : ""}`}
                  {...register("date")}
                />
              </div>
            </FormField>

            {/* Tipo de serviço */}
            <FormField
              label="Tipo de serviço"
              error={errors.serviceType?.message}
              required
            >
              <Controller
                control={control}
                name="serviceType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={errors.serviceType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione o serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog.map((svc) => (
                        <SelectItem key={svc.id} value={svc.name}>
                          {svc.name}
                        </SelectItem>
                      ))}
                      {catalog.length === 0 && (
                        <SelectItem value={appointment.serviceType}>
                          {appointment.serviceType}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {/* Valor */}
            <FormField
              label="Valor do serviço"
              error={errors.value?.message}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  R$
                </span>
                <Input
                  className="pl-8"
                  value={valueDisplay}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "");
                    setValueDisplay(maskCurrency(raw));
                    setValue("value", parseCurrency(maskCurrency(raw)));
                  }}
                  placeholder="0,00"
                />
              </div>
            </FormField>

            {/* Observações */}
            <FormField label="Observações" error={errors.notes?.message}>
              <Textarea
                placeholder="Observações adicionais sobre o serviço..."
                rows={3}
                {...register("notes")}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── Ações ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 pb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/ordens-de-servico")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} className="gap-2">
            <ClipboardList className="w-4 h-4" />
            Criar Ordem de Serviço
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Página com Suspense (obrigatório para useSearchParams no App Router) ─────

export default function NovaOSPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Carregando...
        </div>
      }
    >
      <NovaOSContent />
    </Suspense>
  );
}
