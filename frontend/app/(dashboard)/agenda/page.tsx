"use client";

import { useState, useEffect } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, ClipboardList } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog";
import { useServicesStore } from "@/store/services-store";
import { useAuthStore } from "@/store/auth-store";
import { apiGetAppointments, apiDeleteAppointment, apiConvertAppointmentToOS, type ApiAppointment } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Appointment, MaterialUsage } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function mapApiAppointment(api: ApiAppointment): Appointment {
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
    materialsUsed: api.materialsUsed as MaterialUsage[] | undefined,
  };
}

export default function AgendaPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [openForm, setOpenForm] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const appointments = useServicesStore((s) => s.services);
  const setServices = useServicesStore((s) => s.setServices);
  const deleteService = useServicesStore((s) => s.deleteService);
  const updateService = useServicesStore((s) => s.updateService);
  const { token } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!token) return;
    apiGetAppointments(token)
      .then((data) => setServices(data.map(mapApiAppointment)))
      .catch(() => {});
  }, [token]);

  async function handleDelete(appt: Appointment, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    setDeletingId(appt.id);
    try {
      await apiDeleteAppointment(appt.id, token);
      deleteService(appt.id);
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }

  async function handleConvertToOS(appt: Appointment, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    setConvertingId(appt.id);
    try {
      await apiConvertAppointmentToOS(appt.id, token);
      updateService({ ...appt, status: "completed" });
      toast.success(`OS criada a partir de ${appt.clientName}!`);
      router.push("/ordens-de-servico");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao converter em OS");
    } finally {
      setConvertingId(null);
    }
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const selectedDayAppointments = selectedDate
    ? appointments.filter((a) => {
        const start = new Date(a.date + "T12:00:00");
        const end = a.endDate ? new Date(a.endDate + "T12:00:00") : start;
        const sel = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          12
        );
        return sel >= start && sel <= end;
      })
    : [];

  const dayHasAppointments = (day: Date) =>
    appointments.some((a) => {
      const start = new Date(a.date + "T12:00:00");
      const end = a.endDate ? new Date(a.endDate + "T12:00:00") : start;
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
      return d >= start && d <= end;
    });

  return (
    <div className="space-y-5">
      <PageHeader title="Agenda" description="Gerencie os agendamentos de serviços">
        <Button size="sm" onClick={() => { setEditAppt(null); setOpenForm(true); }}>
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
              </h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div key={`pad-${i}`} />
                ))}
                {days.map((day) => {
                  const hasAppts = dayHasAppointments(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const todayDay = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative flex flex-col items-center justify-center aspect-square rounded-lg text-sm transition-colors cursor-pointer",
                        isSelected && "bg-primary text-primary-foreground",
                        !isSelected && todayDay && "border border-primary text-primary font-semibold",
                        !isSelected && !todayDay && "hover:bg-muted/60 text-foreground"
                      )}
                    >
                      <span>{format(day, "d")}</span>
                      {hasAppts && !isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                      )}
                      {hasAppts && isSelected && (
                        <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">
            {selectedDate
              ? format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })
              : "Selecione uma data"}
          </h3>

          {selectedDate && selectedDayAppointments.length === 0 && (
            <div className="flex items-center justify-center py-10 rounded-xl border border-dashed border-border">
              <p className="text-sm text-muted-foreground">Sem agendamentos neste dia.</p>
            </div>
          )}

          {selectedDayAppointments.map((appt) => (
            <div
              key={appt.id}
              className="relative group w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors space-y-2 cursor-pointer"
              onClick={() => { setEditAppt(appt); setOpenForm(true); }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{appt.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{appt.serviceType}</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={appt.status} />
                  {appt.status === "scheduled" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary"
                      title="Iniciar OS"
                      disabled={convertingId === appt.id}
                      onClick={(e) => handleConvertToOS(appt, e)}
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                    disabled={deletingId === appt.id}
                    onClick={(e) => handleDelete(appt, e)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {appt.startTime && appt.endTime
                    ? `${appt.startTime} – ${appt.endTime}`
                    : appt.endDate && appt.endDate !== appt.date
                    ? `${appt.date} → ${appt.endDate}`
                    : appt.date}
                </span>
                <span className="font-medium text-foreground">{formatCurrency(appt.value)}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Responsável: {appt.employeeName}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AppointmentFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        appointment={editAppt}
      />
    </div>
  );
}
