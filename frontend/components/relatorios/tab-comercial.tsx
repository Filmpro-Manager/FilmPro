"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeComercial } from "./report-utils";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart, XCircle, Target, Users, TrendingUp, CheckCircle2,
} from "lucide-react";
import type { Appointment, Quote, Goal, Employee } from "@/types";
import type { ReportFilter } from "./report-utils";

const C1 = "hsl(var(--chart-1, 142 76% 36%))";
const C2 = "hsl(var(--chart-2, 0 72% 51%))";
const C3 = "hsl(217 91% 60%)";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-medium">{typeof e.value === "number" && e.name === "Receita" ? formatCurrency(e.value) : e.value}</span>
        </div>
      ))}
    </div>
  );
}

interface TabComercialProps {
  services: Appointment[];
  quotes: Quote[];
  goals: Goal[];
  employees: Employee[];
  filter: ReportFilter;
}

export function TabComercial({ services, quotes, goals, employees, filter }: TabComercialProps) {
  const data = useMemo(() => computeComercial(services, quotes, goals, employees, filter), [services, quotes, goals, employees, filter]);

  const GOAL_TYPE_LABEL: Record<string, string> = {
    revenue: "Faturamento",
    services: "Serviços",
    new_clients: "Novos Clientes",
    ticket_average: "Ticket Médio",
    conversion_rate: "Taxa de Conversão",
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Serviços Realizados" value={String(data.completed)}   icon={CheckCircle2} valueColor="green" />
        <ReportKpiCard label="Ticket Médio"         value={formatCurrency(data.ticket)} icon={ShoppingCart} valueColor="blue" />
        <ReportKpiCard label="Cancelamentos"        value={String(data.cancelled)}  icon={XCircle}      valueColor="red"  sub={`${data.total > 0 ? ((data.cancelled / data.total) * 100).toFixed(1) : 0}% do total`} />
        <ReportKpiCard label="Conversão Orçamentos" value={`${data.convRate.toFixed(1)}%`} icon={TrendingUp} valueColor={data.convRate >= 50 ? "green" : "yellow"} sub={`${data.quotesConverted}/${data.quotesTotal}`} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Receita Total"    value={formatCurrency(data.totalRev)} icon={TrendingUp} valueColor="green" />
        <ReportKpiCard label="Total Orçamentos" value={String(data.quotesTotal)}      icon={Target}     />
        <ReportKpiCard label="Aprovados"        value={String(data.quotesConverted)}  icon={CheckCircle2} valueColor="green" />
        <ReportKpiCard label="Clientes Atendidos" value={String(data.topClients.length)} icon={Users} />
      </div>

      {/* Evolução mensal */}
      {data.monthlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Serviços e Receita por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10 }} tickFormatter={(v) => String(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar yAxisId="left"  dataKey="Servicos" name="Serviços" fill={C3} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="Receita"  name="Receita"  fill={C1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Ranking de funcionários */}
        {data.empRanking.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Ranking por Funcionário</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.empRanking.slice(0, 8).map((emp, i) => (
                  <div key={emp.name} className="flex items-center gap-3 py-1 border-b border-border/40 last:border-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-yellow-400 text-yellow-900" : i === 1 ? "bg-slate-300 text-slate-700" : i === 2 ? "bg-amber-600 text-white" : "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">{emp.count} serviços</p>
                    </div>
                    <span className="text-sm font-semibold text-green-500">{formatCurrency(emp.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Clientes */}
        {data.topClients.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Top Clientes por Receita</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topClients.slice(0, 8).map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3 py-1 border-b border-border/40 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} serviços</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Meta vs Realizado */}
      {data.relevantGoals.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Meta vs Realizado — Período</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.relevantGoals.map((g) => {
                const pct = g.target > 0 ? Math.min((g.achieved / g.target) * 100, 100) : 0;
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{GOAL_TYPE_LABEL[g.type] || g.type}</span>
                      <span className="font-medium">
                        {g.type === "revenue" || g.type === "ticket_average"
                          ? `${formatCurrency(g.achieved)} / ${formatCurrency(g.target)}`
                          : `${g.achieved} / ${g.target}`}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? "bg-green-500" : pct >= 70 ? "bg-primary" : pct >= 40 ? "bg-yellow-500" : "bg-destructive"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct.toFixed(1)}%</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
