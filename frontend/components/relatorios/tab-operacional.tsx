"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeOperacional } from "./report-utils";
import { formatCurrency } from "@/lib/utils";
import {
  Wrench, Clock, AlertTriangle, Users, TrendingUp, CheckCircle2,
} from "lucide-react";
import type { Appointment } from "@/types";
import type { ReportFilter } from "./report-utils";

const C1 = "hsl(var(--chart-1, 142 76% 36%))";
const C2 = "hsl(217 91% 60%)";
const C3 = "hsl(var(--chart-2, 0 72% 51%))";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-medium">{e.value}</span>
        </div>
      ))}
    </div>
  );
}

interface TabOperacionalProps {
  services: Appointment[];
  filter: ReportFilter;
}

export function TabOperacional({ services, filter }: TabOperacionalProps) {
  const data = useMemo(() => computeOperacional(services, filter), [services, filter]);

  function fmtMinutes(m: number) {
    if (m <= 0) return "—";
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return h > 0 ? `${h}h ${min}min` : `${min}min`;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Serviços Realizados" value={String(data.completed)}        icon={CheckCircle2} valueColor="green" />
        <ReportKpiCard label="Total no Período"    value={String(data.total)}            icon={Wrench} />
        <ReportKpiCard label="Tempo Médio"         value={fmtMinutes(data.avgMinutes)}   icon={Clock}        valueColor="blue" />
        <ReportKpiCard label="Taxa de Retrabalho"  value={`${data.reworkRate.toFixed(1)}%`} icon={AlertTriangle}
          valueColor={data.reworkRate > 10 ? "red" : data.reworkRate > 5 ? "yellow" : "green"} sub={`${data.reworks} ocorrências`} />
      </div>

      {/* Evolução mensal */}
      {data.monthlyData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Serviços por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="Realizados"  fill={C1} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Cancelados"  fill={C3} radius={[4, 4, 0, 0]} />
                <Bar dataKey="Retrabalhos" fill={C2} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Por tipo de serviço */}
        {data.byServiceType.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Por Tipo de Serviço</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.byServiceType.slice(0, 10).map((s) => {
                  const pct = data.completed > 0 ? (s.count / data.completed) * 100 : 0;
                  return (
                    <div key={s.name} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate max-w-[60%]">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{s.count}×</span>
                          <span className="font-medium">{formatCurrency(s.revenue)}</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Produtividade por funcionário */}
        {data.empProductivity.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Produtividade por Funcionário</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.empProductivity.slice(0, 8).map((emp) => (
                  <div key={emp.name} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.count} serviços
                        {emp.avgMinutes > 0 && ` · ${fmtMinutes(emp.avgMinutes)} médio`}
                        {emp.reworks > 0 && <span className="text-destructive ml-1">· {emp.reworks} retrabalho(s)</span>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-500">{formatCurrency(emp.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Gráfico por tipo de serviço */}
      {data.byServiceType.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Receita e Volume por Tipo de Serviço</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byServiceType.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number | undefined, name) => name === "revenue" ? formatCurrency(v ?? 0) : (v ?? 0)} />
                <Legend />
                <Bar dataKey="revenue" name="Receita (R$)" fill={C1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
