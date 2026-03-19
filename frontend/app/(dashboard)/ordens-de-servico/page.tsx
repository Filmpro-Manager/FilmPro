"use client";

import { useState, useEffect } from "react";
import {
  Search, Zap, ClipboardList, CheckCircle2, Clock, XCircle,
  Calendar, MoreHorizontal, ChevronDown, Trash2, Car, Landmark,
} from "lucide-react";
import { useServicesStore } from "@/store/services-store";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { QuickServiceDialog } from "@/components/shared/quick-service-dialog";
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { CompleteServiceOrderDialog } from "@/components/ordens-de-servico/complete-service-order-dialog";
import { apiGetServiceOrders, apiUpdateServiceOrderStatus, apiDeleteServiceOrder, type ApiServiceOrder } from "@/lib/api";
import { formatCurrency, formatDate, appointmentStatusLabel } from "@/lib/utils";
import type { Appointment, AppointmentStatus, ServiceCategory } from "@/types";

type FilterStatus = "all" | AppointmentStatus;
type FilterCategory = "all" | ServiceCategory;

function mapApiServiceOrder(api: ApiServiceOrder): Appointment {
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
    sourceAppointmentId: api.sourceAppointmentId ?? undefined,
  };
}

// Deriva categoria quando não está explícita no registro
function categoryOf(s: Appointment): ServiceCategory {
  if (s.category) return s.category;
  if (s.vehicle && s.vehicle.trim() !== "" && s.vehicle !== "—") return "automotive";
  return "architecture";
}

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  automotive: "Automotivo",
  architecture: "Arquitetura",
};

const CATEGORY_ICONS: Record<ServiceCategory, React.ElementType> = {
  automotive: Car,
  architecture: Landmark,
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  automotive: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  architecture: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

const CATEGORY_TABS: { label: string; value: FilterCategory }[] = [
  { label: "Todos", value: "all" },
  { label: "Automotivo", value: "automotive" },
  { label: "Arquitetura", value: "architecture" },
];

const STATUS_TABS: { label: string; value: FilterStatus }[] = [
  { label: "Todos", value: "all" },
  { label: "Rascunho", value: "draft" },
  { label: "Criadas", value: "created" },
  { label: "Agendados", value: "scheduled" },
  { label: "Em Andamento", value: "in_progress" },
  { label: "Finalizados", value: "completed" },
  { label: "Cancelados", value: "cancelled" },
];

const STATUS_ACTIONS: { label: string; value: AppointmentStatus }[] = [
  { label: "Agendar", value: "scheduled" },
  { label: "Iniciar serviço", value: "in_progress" },
  { label: "Finalizar", value: "completed" },
  { label: "Cancelar", value: "cancelled" },
];

export default function OrdensDeServicoPage() {
  const { services, updateStatus, deleteService, setServices } = useServicesStore();
  const isEmployee = useAuthStore((s) => s.user?.role === "EMPLOYEE");
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    apiGetServiceOrders(token)
      .then((data) => setServices(data.map(mapApiServiceOrder)))
      .catch(() => {});
  }, [token]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterCategory, setFilterCategory] = useState<FilterCategory>("all");
  const [quickOpen, setQuickOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Appointment | null>(null);

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filtered = services.filter((s) => {
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    const matchCategory = filterCategory === "all" || categoryOf(s) === filterCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.clientName.toLowerCase().includes(q) ||
      s.serviceType.toLowerCase().includes(q) ||
      s.employeeName.toLowerCase().includes(q) ||
      s.vehicle.toLowerCase().includes(q);
    return matchStatus && matchCategory && matchSearch;
  });

  // ── Contagens ─────────────────────────────────────────────────────────────
  const counts = {
    all: services.length,
    draft: services.filter((s) => s.status === "draft").length,
    created: services.filter((s) => s.status === "created").length,
    scheduled: services.filter((s) => s.status === "scheduled").length,
    in_progress: services.filter((s) => s.status === "in_progress").length,
    completed: services.filter((s) => s.status === "completed").length,
    cancelled: services.filter((s) => s.status === "cancelled").length,
  };

  const completedRevenue = services
    .filter((s) => s.status === "completed")
    .reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* ── Cabeçalho ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ordens de Serviço</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os serviços agendados e realizados
          </p>
        </div>
        <Button onClick={() => setQuickOpen(true)} className="gap-2">
          <Zap className="w-4 h-4" />
          Lançamento Rápido
        </Button>
      </div>

      {/* ── Cards de resumo ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total de Ordens</p>
                <p className="text-2xl font-bold">{counts.all}</p>
              </div>
              <ClipboardList className="w-5 h-5 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Agendados</p>
                <p className="text-2xl font-bold text-blue-500">{counts.scheduled}</p>
              </div>
              <Calendar className="w-5 h-5 text-blue-400 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
                <p className="text-2xl font-bold text-amber-500">{counts.in_progress}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-400 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Finalizados</p>
                <p className="text-2xl font-bold text-emerald-500">{counts.completed}</p>
                {!isEmployee && (
                  <p className="text-xs text-muted-foreground">{formatCurrency(completedRevenue)}</p>
                )}
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filtros + busca ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar cliente, serviço, técnico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={
                  `rounded-full px-3 py-1 text-xs font-medium transition-colors ` +
                  (filterStatus === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80")
                }
              >
                {tab.label}
                <span className="ml-1.5 opacity-70">
                  {tab.value === "all" ? counts.all : counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Filtro por categoria ──────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Tipo:</span>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.value !== "all" ? CATEGORY_ICONS[tab.value as ServiceCategory] : null;
              const active = filterCategory === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setFilterCategory(tab.value)}
                  className={
                    `flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors border ` +
                    (active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/60")
                  }
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Tabela ──────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Veículo</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Serviço</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Responsável</th>
                {!isEmployee && <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Valor</th>}
                {!isEmployee && <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide hidden sm:table-cell">Pgto</th>}
                <th className="text-center px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 7 : 9} className="px-4 py-12 text-center text-muted-foreground text-sm">
                    <XCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma ordem encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((service) => (
                  <tr key={service.id} className="hover:bg-muted/30 transition-colors">
                    {/* Data */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(service.date)}
                      {service.endDate && service.endDate !== service.date && (
                        <span className="text-xs block text-muted-foreground/60">
                          até {formatDate(service.endDate)}
                        </span>
                      )}
                    </td>

                    {/* Cliente */}
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {service.clientName}
                    </td>

                    {/* Veículo */}
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell max-w-[160px] truncate">
                      {service.vehicle}
                    </td>

                    {/* Serviço */}
                    <td className="px-4 py-3 max-w-[200px]">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const cat = categoryOf(service);
                          const Icon = CATEGORY_ICONS[cat];
                          return (
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[cat]}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {CATEGORY_LABELS[cat]}
                            </span>
                          );
                        })()}
                      </div>
                      <span className="truncate block text-sm">{service.serviceType}</span>
                      {service.notes && (
                        <span className="text-xs text-muted-foreground truncate block">
                          {service.notes}
                        </span>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                      {service.employeeName}
                    </td>

                    {/* Valor */}
                    {!isEmployee && (
                      <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                        {formatCurrency(service.value)}
                      </td>
                    )}

                    {/* Pgto */}
                    {!isEmployee && (
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {service.paymentMethod ? (
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs">{service.paymentMethod}</span>
                            <Badge
                              variant={service.paid ? "success" : "warning"}
                              className="text-[10px] h-4 px-1.5"
                            >
                              {service.paid ? "Pago" : "Pendente"}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    )}

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={service.status} />
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel className="text-xs">Alterar Status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {STATUS_ACTIONS.filter((a) => a.value !== service.status).map((action) => (
                            <DropdownMenuItem
                              key={action.value}
                              onClick={() => {
                                if (action.value === "completed") {
                                  setCompleteTarget(service);
                                } else {
                                  updateStatus(service.id, action.value);
                                  if (token) apiUpdateServiceOrderStatus(service.id, action.value, token).catch(() => {});
                                }
                              }}
                              className="text-sm cursor-pointer"
                            >
                              {action.label}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ id: service.id, name: `${service.clientName} — ${service.serviceType}` })}
                            className="text-sm cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Excluir ordem
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 bg-muted/30 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {filtered.length} {filtered.length === 1 ? "ordem" : "ordens"} encontrada{filtered.length !== 1 ? "s" : ""}
            </p>
            {!isEmployee && (
              <p className="text-xs font-medium">
                Total filtrado: {formatCurrency(filtered.reduce((acc, s) => acc + s.value, 0))}
              </p>
            )}
          </div>
        )}
      </div>

      <QuickServiceDialog open={quickOpen} onOpenChange={setQuickOpen} />

      {/* Formulário de edição de OS — abre ao converter um orçamento */}
      <AppointmentFormDialog
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
        appointment={editTarget}
      />

      <CompleteServiceOrderDialog
        open={!!completeTarget}
        onOpenChange={(open) => !open && setCompleteTarget(null)}
        serviceOrder={completeTarget}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="ordem de serviço"
        onConfirm={() => { if (deleteTarget) { deleteService(deleteTarget.id); if (token) apiDeleteServiceOrder(deleteTarget.id, token).catch(() => {}); } }}
      />
    </div>
  );
}
