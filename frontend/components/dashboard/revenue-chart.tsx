"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTransactionsStore } from "@/store/transactions-store";
import { formatCurrency } from "@/lib/utils";
import type { DashboardPeriod } from "@/components/dashboard/period-selector";

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface RevenueChartProps {
  period: DashboardPeriod;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-sm">
      <p className="font-medium mb-2 text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.name === "receita" ? "Receita" : "Despesa"}:</span>
          <span className="font-medium text-foreground">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ period }: RevenueChartProps) {
  const transactions = useTransactionsStore((s) => s.transactions);

  const chartData = useMemo(() => {
    // Build last 6 months ending at selected period
    const months: { year: number; month: number }[] = [];
    let y = period.year;
    let m = period.month;
    for (let i = 0; i < 6; i++) {
      months.unshift({ year: y, month: m });
      if (m === 0) { m = 11; y--; } else { m--; }
    }

    return months.map(({ year: fy, month: fm }) => {
      const prefix = `${fy}-${String(fm + 1).padStart(2, "0")}`;
      const receita = transactions
        .filter((t) => t.type === "income" && t.date.startsWith(prefix))
        .reduce((acc, t) => acc + t.amount, 0);
      const despesa = transactions
        .filter((t) => t.type === "expense" && t.date.startsWith(prefix))
        .reduce((acc, t) => acc + t.amount, 0);
      return { month: MONTHS_SHORT[fm], receita, despesa };
    });
  }, [transactions, period]);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Receita × Despesa — Últimos 6 meses</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(221,83%,53%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="despesaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0,72%,51%)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(0,72%,51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="receita"
              stroke="hsl(221,83%,53%)"
              strokeWidth={2}
              fill="url(#receitaGrad)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="despesa"
              stroke="hsl(0,72%,51%)"
              strokeWidth={2}
              fill="url(#despesaGrad)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
