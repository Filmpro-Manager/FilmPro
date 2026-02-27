"use client";

import { useMemo } from "react";
import { Clock, CheckCircle2, CalendarDays, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Appointment, Employee } from "@/types";
import type { DashFilter } from "./dash-filter-bar";

interface Props {
  services: Appointment[];
  employees: Employee[];
  filter: DashFilter;
}

export function DashOperacao({ services, employees, filter }: Props) {
  const today = format(new Date(), "yyyy-MM-dd");

  const stats = useMemo(() => {
    const inRange = (s: Appointment) => s.date >= filter.from && s.date <= filter.to;

    const inProgress    = services.filter((s) => s.status === "in_progress").length;
    const completedToday = services.filter((s) => s.status === "completed" && s.date === today).length;
    const scheduledToday = services.filter((s) => s.status === "scheduled" && s.date === today).length;

    const withTime = services.filter((s) => inRange(s) && s.actualMinutes && s.actualMinutes > 0);
    const avgMin   = withTime.length > 0
      ? Math.round(withTime.reduce((a, s) => a + (s.actualMinutes ?? 0), 0) / withTime.length)
      : null;

    const activeEmployees = employees.filter((e) => e.active).length;

    // Próximas OS do dia (para lista)
    const upcoming = services
      .filter((s) => s.date === today && (s.status === "scheduled" || s.status === "in_progress"))
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
      .slice(0, 5);

    return { inProgress, completedToday, scheduledToday, avgMin, activeEmployees, upcoming };
  }, [services, employees, filter, today]);

  const kpis = [
    { label: "Em andamento",   value: stats.inProgress,    icon: Loader2,      color: "text-blue-500",    bg: "bg-blue-500/10" },
    { label: "Concluídas hoje", value: stats.completedToday, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Agendadas hoje",  value: stats.scheduledToday, icon: CalendarDays, color: "text-amber-500",   bg: "bg-amber-500/10" },
    {
      label: "Tempo médio",
      value: stats.avgMin !== null ? `${stats.avgMin}min` : "—",
      icon: Clock, color: "text-muted-foreground", bg: "bg-muted"
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Operação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {kpis.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5">
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", bg)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-base font-bold leading-none text-foreground">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {stats.activeEmployees > 0 && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{stats.activeEmployees}</span> funcionários ativos
          </p>
        )}

        {stats.upcoming.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Próximas hoje</p>
            {stats.upcoming.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  {s.startTime && <span className="text-muted-foreground shrink-0">{s.startTime}</span>}
                  <span className="truncate text-foreground">{s.clientName}</span>
                </div>
                <Badge variant={s.status === "in_progress" ? "blue" : "secondary"} className="text-[10px] shrink-0">
                  {s.status === "in_progress" ? "Em andamento" : "Agendado"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
