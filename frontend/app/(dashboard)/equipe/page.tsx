"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEmployeesStore } from "@/store/employees-store";
import { useServicesStore } from "@/store/services-store";
import { useAuthStore } from "@/store/auth-store";
import { formatCurrency } from "@/lib/utils";
import { Appointment, Employee } from "@/types";
import { apiGetUsers, apiDeleteUser, type UserProfile } from "@/lib/api";
import { toast } from "sonner";
import {
  UserPlus,
  Phone,
  Mail,
  BarChart2,
  Users,
  Pencil,
  Briefcase,
  CalendarDays,
  Clock,
  Car,
  Building2,
  Trash2,
} from "lucide-react";
import { EmployeeFormDialog } from "@/components/equipe/employee-form-dialog";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

function mapApiUserToEmployee(u: UserProfile): Employee {
  const roleUpper = u.role.toUpperCase() as Employee["userRole"];
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: (u as unknown as { phone?: string }).phone ?? "",
    role:
      u.role === "owner" || u.role === "manager"
        ? "Administrador"
        : "Técnico",
    userRole: roleUpper,
    active: u.status === "active",
    hireDate: u.createdAt.slice(0, 10),
    servicesCompleted: 0,
    revenueGenerated: 0,
    specialties: [],
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getEmployeeStats(employeeId: string, appointments: Appointment[]) {
  const appts = appointments.filter(
    (a) => a.employeeId === employeeId
  );
  const completed = appts.filter((a) => a.status === "completed");
  const revenue = completed.reduce((sum, a) => sum + (a.value ?? 0), 0);
  return { total: appts.length, completed: completed.length, revenue };
}

function getScheduleForDate(employeeId: string, date: string, appointments: Appointment[]): Appointment[] {
  return appointments
    .filter((a) => {
      if (a.employeeId !== employeeId) return false;
      const end = a.endDate ?? a.date;
      return date >= a.date && date <= end;
    })
    .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""));
}

type DayStatus = "inactive" | "working" | "scheduled" | "free";

function getDayStatus(employee: Employee, date: string, appointments: Appointment[]): DayStatus {
  if (!employee.active) return "inactive";
  const appts = getScheduleForDate(employee.id, date, appointments);
  if (appts.some((a) => a.status === "in_progress")) return "working";
  if (appts.some((a) => a.status === "scheduled")) return "scheduled";
  return "free";
}

const dayStatusConfig: Record<
  DayStatus,
  { label: string; className: string; dotClass: string }
> = {
  inactive: {
    label: "Inativo",
    className: "bg-muted text-muted-foreground",
    dotClass: "bg-muted-foreground",
  },
  working: {
    label: "Em Serviço",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
    dotClass: "bg-green-500 animate-pulse",
  },
  scheduled: {
    label: "Agendado",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dotClass: "bg-blue-500",
  },
  free: {
    label: "Livre",
    className: "bg-secondary text-muted-foreground",
    dotClass: "bg-muted-foreground/40",
  },
};

const apptStatusConfig: Record<
  string,
  { label: string; className: string }
> = {
  scheduled: {
    label: "Agendado",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  completed: {
    label: "Concluído",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive",
  },
};

function toLocalDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const roleLabel: Record<string, string> = {
  OWNER: "Administrador",
  MANAGER: "Administrador",
  EMPLOYEE: "Técnico",
  owner: "Administrador",
  manager: "Administrador",
  employee: "Técnico",
};

const roleVariant: Record<string, "blue" | "secondary" | "default"> = {
  OWNER: "default",
  MANAGER: "blue",
  EMPLOYEE: "secondary",
  owner: "default",
  manager: "blue",
  employee: "secondary",
};

export default function EquipePage() {
  const today = toLocalDateString(new Date());
  const employees = useEmployeesStore((s) => s.employees);
  const setEmployees = useEmployeesStore((s) => s.setEmployees);
  const deleteEmployeeStore = useEmployeesStore((s) => s.deleteEmployee);
  const services = useServicesStore((s) => s.services);
  const { token } = useAuthStore();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    apiGetUsers(token)
      .then((data) => setEmployees(data.map(mapApiUserToEmployee)))
      .catch(() => toast.error("Erro ao carregar usuários"));
  }, [token]);

  const filtered = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      emp.phone?.includes(search) ||
      emp.specialties?.some((s) =>
        s.toLowerCase().includes(search.toLowerCase())
      )
  );

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormOpen(true);
  };

  const handleNew = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const isToday = selectedDate === today;

  // Summary counts
  const activeCount = employees.filter((e) => e.active).length;
  const adminCount = employees.filter(
    (e) => e.userRole === "OWNER"
  ).length;
  const techCount = employees.filter(
    (e) => e.userRole === "EMPLOYEE"
  ).length;
  const busyCount = employees.filter((e) => {
    const s = getDayStatus(e, selectedDate, services);
    return s === "working" || s === "scheduled";
  }).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        description="Gerencie os membros da sua equipe"
      >
        <Button size="sm" className="gap-2" onClick={handleNew}>
          <UserPlus className="w-4 h-4" />
          Novo Membro
        </Button>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-xs text-muted-foreground">membros ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{adminCount}</p>
              <p className="text-xs text-muted-foreground">administradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <BarChart2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{techCount}</p>
              <p className="text-xs text-muted-foreground">técnicos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <CalendarDays className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{busyCount}</p>
              <p className="text-xs text-muted-foreground">
                {isToday ? "trabalhando hoje" : "com agenda no dia"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <SearchInput
          placeholder="Buscar por nome, email, especialidade..."
          value={search}
          onChange={(value) => setSearch(value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm shadow-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors focus-within:ring-1 focus-within:ring-ring">
            <CalendarDays className="w-4 h-4 text-muted-foreground pointer-events-none shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent outline-none text-sm text-foreground [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
            />
          </label>
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(today)}
            >
              Hoje
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center -mt-2">
        <span className="text-sm text-muted-foreground">
          {filtered.length} de {employees.length} membros
        </span>
      </div>

      {/* Employee Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Users className="w-10 h-10 opacity-40" />
          <p>Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((emp) => {
            const stats = getEmployeeStats(emp.id, services);
            const dayStatus = getDayStatus(emp, selectedDate, services);
            const schedule = getScheduleForDate(emp.id, selectedDate, services);
            const dsc = dayStatusConfig[dayStatus];

            return (
              <Card key={emp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(emp.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{emp.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <Badge
                            variant={roleVariant[emp.userRole] ?? "secondary"}
                            className="text-xs"
                          >
                            {roleLabel[emp.userRole] ?? emp.role}
                          </Badge>
                          {!emp.active && (
                            <Badge variant="destructive" className="text-xs">
                              Inativo
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Day status pill */}
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${dsc.className}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dsc.dotClass}`}
                        />
                        {dsc.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => handleEdit(emp)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: emp.id, name: emp.name })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1.5 text-sm">
                    {emp.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{emp.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Specialties */}
                  {emp.specialties && emp.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {emp.specialties.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Schedule for selected date */}
                  <div className="border-t pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {isToday ? "Agenda de Hoje" : "Agenda do Dia"}
                    </p>

                    {schedule.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        {emp.active
                          ? "Nenhum serviço agendado."
                          : "Membro inativo."}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {schedule.map((appt) => {
                          const asc =
                            apptStatusConfig[appt.status] ??
                            apptStatusConfig.scheduled;
                          return (
                            <div
                              key={appt.id}
                              className="rounded-md bg-muted/50 p-2.5 space-y-1.5 text-xs"
                            >
                              {/* Time + status */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1 font-medium text-foreground">
                                  <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                                  {appt.startTime && appt.endTime
                                    ? `${appt.startTime} – ${appt.endTime}`
                                    : appt.endDate && appt.endDate !== appt.date
                                    ? `${appt.date} → ${appt.endDate}`
                                    : appt.date}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${asc.className}`}
                                >
                                  {asc.label}
                                </span>
                              </div>

                              {/* Client */}
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Building2 className="w-3 h-3 shrink-0" />
                                <span className="font-medium text-foreground">
                                  {appt.clientName}
                                </span>
                              </div>

                              {/* Vehicle */}
                              {appt.vehicle && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Car className="w-3 h-3 shrink-0" />
                                  <span>{appt.vehicle}</span>
                                </div>
                              )}

                              {/* Service */}
                              <div className="text-muted-foreground truncate">
                                {appt.serviceType}
                              </div>

                              {/* Value */}
                              {appt.value != null && (
                                <div className="flex items-center justify-between pt-0.5 border-t border-border/50">
                                  <span className="text-muted-foreground">
                                    Valor
                                  </span>
                                  <span className="font-semibold text-foreground">
                                    {formatCurrency(appt.value)}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* All-time Stats */}
                  <div className="pt-1 border-t grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-bold">{stats.total}</p>
                      <p className="text-xs text-muted-foreground">Serviços</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-green-600">
                        {stats.completed}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Concluídos
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-primary">
                        {formatCurrency(stats.revenue)}
                      </p>
                      <p className="text-xs text-muted-foreground">Gerado</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        employee={editingEmployee}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="usuário"
        onConfirm={async () => {
          if (!deleteTarget || !token) return;
          try {
            await apiDeleteUser(deleteTarget.id, token);
            deleteEmployeeStore(deleteTarget.id);
            setDeleteTarget(null);
            toast.success("Usuário removido com sucesso!");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao remover usuário");
          }
        }}
      />
    </div>
  );
}
