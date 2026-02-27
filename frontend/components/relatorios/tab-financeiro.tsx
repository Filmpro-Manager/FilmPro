"use client";

import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeFinanceiro } from "./report-utils";
import { formatCurrency, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard,
  AlertCircle, Receipt,
} from "lucide-react";
import type { Transaction } from "@/types";
import type { ReportFilter } from "./report-utils";

const C1 = "hsl(var(--chart-1, 142 76% 36%))";
const C2 = "hsl(var(--chart-2, 0 72% 51%))";
const C3 = "hsl(var(--chart-3, 217 91% 60%))";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs">
      <p className="font-medium mb-1 text-foreground">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{e.name}:</span>
          <span className="font-medium">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

function DRERow({ label, value, indent = 0, bold = false, positive = false, negative = false }: {
  label: string; value: number; indent?: number; bold?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className={cn("flex items-center justify-between py-2 border-b border-border/40 last:border-0", bold && "font-semibold")}
         style={{ paddingLeft: indent * 16 }}>
      <span className={cn("text-sm", !bold && "text-muted-foreground")}>{label}</span>
      <span className={cn("text-sm font-mono font-medium",
        negative && value < 0 && "text-destructive",
        positive && value > 0 && "text-green-500",
        bold && "text-base"
      )}>
        {formatCurrency(value)}
      </span>
    </div>
  );
}

interface TabFinanceiroProps {
  transactions: Transaction[];
  filter: ReportFilter;
}

export function TabFinanceiro({ transactions, filter }: TabFinanceiroProps) {
  const data = useMemo(() => computeFinanceiro(transactions, filter), [transactions, filter]);

  const catIncomeItems = Object.entries(data.byCategoryIncome)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const catExpenseItems = Object.entries(data.byCategoryExpense)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Receita Total" value={formatCurrency(data.totalIncome)}  icon={TrendingUp}   valueColor="green" />
        <ReportKpiCard label="Despesas"       value={formatCurrency(data.totalExpense)} icon={TrendingDown}  valueColor="red" />
        <ReportKpiCard label="Lucro Bruto"    value={formatCurrency(data.grossProfit)}  icon={DollarSign}
          valueColor={data.grossProfit >= 0 ? "green" : "red"} />
        <ReportKpiCard label="Margem" value={`${data.margin.toFixed(1)}%`} icon={Receipt}
          valueColor={data.margin >= 20 ? "green" : data.margin >= 0 ? "yellow" : "red"} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="A Receber" value={formatCurrency(data.toReceive.reduce((a, t) => a + t.amount, 0))} icon={CreditCard}  valueColor="blue" sub={`${data.toReceive.length} lançamentos`} />
        <ReportKpiCard label="A Pagar"   value={formatCurrency(data.toPay.reduce((a, t) => a + t.amount, 0))}    icon={CreditCard}  valueColor="yellow" sub={`${data.toPay.length} lançamentos`} />
        <ReportKpiCard label="Inadimplência" value={formatCurrency(data.overdue.reduce((a, t) => a + t.amount, 0))} icon={AlertCircle} valueColor="red" sub={`${data.overdue.length} em atraso`} />
        <ReportKpiCard label="Saldo"     value={formatCurrency(data.totalIncome - data.totalExpense)} icon={DollarSign}
          valueColor={data.totalIncome - data.totalExpense >= 0 ? "green" : "red"} />
      </div>

      {/* Evolução mensal */}
      {data.monthlyData.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução — Receita × Despesa × Lucro</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.monthlyData}>
                <defs>
                  <linearGradient id="fGr1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C1} stopOpacity={0.15} /><stop offset="95%" stopColor={C1} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fGr2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C2} stopOpacity={0.12} /><stop offset="95%" stopColor={C2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="Receita" stroke={C1} fill="url(#fGr1)" strokeWidth={2} />
                <Area type="monotone" dataKey="Despesa" stroke={C2} fill="url(#fGr2)" strokeWidth={2} />
                <Area type="monotone" dataKey="Lucro"   stroke={C3} fill="none"         strokeWidth={2} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Receita por categoria */}
        {catIncomeItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Receita por Categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catIncomeItems} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Bar dataKey="value" name="Receita" fill={C1} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Despesas por categoria */}
        {catExpenseItems.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={catExpenseItems} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Bar dataKey="value" name="Despesa" fill={C2} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contas a pagar e receber */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* A Receber */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Contas a Receber</CardTitle></CardHeader>
          <CardContent>
            {data.toReceive.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conta a receber no período.</p>
            ) : (
              <div className="space-y-2">
                {data.toReceive.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.clientName} · vence {t.dueDate ? formatDate(t.dueDate) : "—"}</p>
                    </div>
                    <span className="font-semibold text-green-500">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* A Pagar */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Contas a Pagar</CardTitle></CardHeader>
          <CardContent>
            {data.toPay.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conta a pagar no período.</p>
            ) : (
              <div className="space-y-2">
                {data.toPay.slice(0, 8).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category} · vence {t.dueDate ? formatDate(t.dueDate) : "—"}</p>
                    </div>
                    <span className="font-semibold text-destructive">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DRE */}
      <Card>
        <CardHeader><CardTitle className="text-sm">DRE Simplificado</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border/40">
          <DRERow label="(+) Receita Bruta de Serviços" value={data.totalIncome} positive bold />
          <DRERow label="(-) Custos de Materiais" value={-data.dreMaterial} negative={data.dreMaterial > 0} indent={1} />
          <DRERow label="(=) Receita Líquida de Serviços" value={data.totalIncome - data.dreMaterial} positive={data.totalIncome - data.dreMaterial >= 0} bold />
          <div className="pt-1">
            <DRERow label="(-) Despesas Operacionais" value={-(data.totalExpense - data.dreMaterial)} negative bold />
            {data.dreSalaries  > 0 && <DRERow label="Salários e Comissões" value={-data.dreSalaries}  indent={1} negative />}
            {data.dreRent      > 0 && <DRERow label="Aluguel e Utilidades" value={-data.dreRent}      indent={1} negative />}
            {data.dreMarketing > 0 && <DRERow label="Marketing"            value={-data.dreMarketing} indent={1} negative />}
            {data.dreOther     > 0 && <DRERow label="Outras Despesas"      value={-data.dreOther}     indent={1} negative />}
          </div>
          <div className="pt-1">
            <DRERow label="(=) Lucro Líquido" value={data.grossProfit} positive={data.grossProfit >= 0} negative={data.grossProfit < 0} bold />
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Margem Líquida</span>
            <Badge variant={data.margin >= 20 ? "success" : data.margin >= 0 ? "warning" : "destructive"}>
              {data.margin.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
