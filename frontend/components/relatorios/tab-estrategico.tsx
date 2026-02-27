"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeEstrategico } from "./report-utils";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Target, Calendar, BarChart2 } from "lucide-react";
import type { Transaction, Appointment } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const C1 = "hsl(var(--chart-1, 142 76% 36%))";
const C2 = "hsl(var(--chart-2, 0 72% 51%))";
const C3 = "hsl(217 91% 60%)";

function MoneyTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-medium">
            {e.name === "growth" || e.name === "Crescimento" ? `${e.value.toFixed(1)}%` : formatCurrency(e.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

interface TabEstrategicoProps {
  transactions: Transaction[];
  services: Appointment[];
}

export function TabEstrategico({ transactions, services }: TabEstrategicoProps) {
  const data = useMemo(() => computeEstrategico(transactions, services), [transactions, services]);

  // Format month label
  const formattedGrowth = data.growthData.map((d) => ({
    ...d,
    label: format(new Date(d.month + "-01"), "MMM/yy", { locale: ptBR }),
  }));

  const curMonthLabel = formattedGrowth.length > 0 ? formattedGrowth[formattedGrowth.length - 1].label : "—";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard
          label="Receita (Mês Atual)"
          value={formatCurrency(data.curRev)}
          icon={TrendingUp}
          valueColor="green"
          trend={data.mom}
        />
        <ReportKpiCard
          label="Crescimento MoM"
          value={`${data.mom > 0 ? "+" : ""}${data.mom.toFixed(1)}%`}
          icon={data.mom >= 0 ? TrendingUp : TrendingDown}
          valueColor={data.mom > 0 ? "green" : data.mom < 0 ? "red" : "default"}
          sub="vs mês anterior"
        />
        <ReportKpiCard
          label="Crescimento Anual"
          value={`${data.yoy > 0 ? "+" : ""}${data.yoy.toFixed(1)}%`}
          icon={data.yoy >= 0 ? TrendingUp : TrendingDown}
          valueColor={data.yoy > 0 ? "green" : data.yoy < 0 ? "red" : "default"}
          sub="vs mesmo mês ano ant."
        />
        <ReportKpiCard
          label="Projeção Próximo Mês"
          value={formatCurrency(data.projection)}
          icon={Target}
          valueColor="blue"
          sub="média últimos 3 meses"
        />
      </div>

      {/* Evolução 12 meses */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Evolução — Últimos 12 Meses</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={formattedGrowth}>
              <defs>
                <linearGradient id="eGr1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C1} stopOpacity={0.15} /><stop offset="95%" stopColor={C1} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="eGr2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C2} stopOpacity={0.1} /><stop offset="95%" stopColor={C2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
              <Tooltip content={<MoneyTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="Receita" stroke={C1} fill="url(#eGr1)" strokeWidth={2} />
              <Area type="monotone" dataKey="Despesa" stroke={C2} fill="url(#eGr2)" strokeWidth={2} />
              <Area type="monotone" dataKey="Lucro"   stroke={C3} fill="none"         strokeWidth={2} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Crescimento % MoM */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Crescimento de Receita — Mês a Mês (%)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formattedGrowth.slice(1)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
              <ReferenceLine y={0} stroke="hsl(var(--border))" />
              <Bar dataKey="growth" name="Crescimento (%)"
                radius={[4, 4, 0, 0]}
                fill={C1}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Sazonalidade por dia da semana */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" /> Sazonalidade — Dia da Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.seasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v, name) => name === "revenue" ? formatCurrency(Number(v)) : Number(v)} />
                <Legend />
                <Bar yAxisId="left" dataKey="count"   name="Serviços"  fill={C3} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita por dia da semana */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Receita por Dia da Semana</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.seasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="revenue" name="Receita" fill={C1} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de crescimento */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Histórico Mensal — 12 Meses</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Mês</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Receita</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Despesa</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Lucro</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Crescimento</th>
                </tr>
              </thead>
              <tbody>
                {formattedGrowth.map((row) => (
                  <tr key={row.month} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4 font-medium capitalize">{row.label}</td>
                    <td className="py-2 pr-4 text-right text-green-500 font-medium">{formatCurrency(row.Receita)}</td>
                    <td className="py-2 pr-4 text-right text-destructive">{formatCurrency(row.Despesa)}</td>
                    <td className={`py-2 pr-4 text-right font-medium ${row.Lucro >= 0 ? "text-green-500" : "text-destructive"}`}>
                      {formatCurrency(row.Lucro)}
                    </td>
                    <td className="py-2 text-right">
                      {row.growth !== 0 ? (
                        <Badge variant={row.growth > 0 ? "success" : "destructive"} className="text-xs">
                          {row.growth > 0 ? "+" : ""}{row.growth.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
