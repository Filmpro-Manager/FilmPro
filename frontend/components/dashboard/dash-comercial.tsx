"use client";

import { useMemo } from "react";
import { FileSignature, Percent, Receipt, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import type { Appointment, Quote, Goal } from "@/types";
import type { DashFilter } from "./dash-filter-bar";

interface Props {
  services: Appointment[];
  quotes: Quote[];
  goals: Goal[];
  filter: DashFilter;
}

export function DashComercial({ services, quotes, goals, filter }: Props) {
  const stats = useMemo(() => {
    const periodServices = services
      .filter((s) => s.date >= filter.from && s.date <= filter.to && s.status !== "cancelled");
    const periodQuotes = quotes
      .filter((q) => q.issueDate >= filter.from && q.issueDate <= filter.to);
    const converted      = periodQuotes.filter((q) => q.convertedToAppointmentId);
    const convRate       = periodQuotes.length > 0
      ? (converted.length / periodQuotes.length) * 100
      : 0;
    const totalRevenue   = periodServices.reduce((a, s) => a + s.value, 0);
    const ticket         = periodServices.length > 0 ? totalRevenue / periodServices.length : 0;

    // Meta de receita do mês atual
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const revenueGoal = goals.find((g) => g.type === "revenue" && g.period === monthKey && !g.employeeId);

    return { totalQuotes: periodQuotes.length, converted: converted.length, convRate, ticket, revenueGoal };
  }, [services, quotes, goals, filter]);

  const kpis = [
    { label: "Orçamentos criados",  value: stats.totalQuotes,          icon: FileSignature,  color: "text-primary",     bg: "bg-primary/10" },
    { label: "Convertidos",         value: stats.converted,            icon: Receipt,        color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Taxa de conversão",   value: `${stats.convRate.toFixed(0)}%`, icon: Percent,   color: "text-amber-500",   bg: "bg-amber-500/10" },
    { label: "Ticket médio",        value: formatCurrency(stats.ticket), icon: Target,       color: "text-foreground",  bg: "bg-muted" },
  ];

  const goal = stats.revenueGoal;
  const goalPct = goal && goal.target > 0 ? Math.min((goal.achieved / goal.target) * 100, 100) : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Comercial</CardTitle>
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

        {goal && goalPct !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Meta do mês</span>
              <span className="font-semibold text-foreground">{goalPct.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  goalPct >= 100 ? "bg-emerald-500" : goalPct >= 70 ? "bg-primary" : goalPct >= 40 ? "bg-amber-500" : "bg-destructive"
                )}
                style={{ width: `${goalPct}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {formatCurrency(goal.achieved)} de {formatCurrency(goal.target)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
