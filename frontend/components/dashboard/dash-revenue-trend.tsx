"use client";

import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { eachDayOfInterval, parseISO, format, subDays } from "date-fns";
import type { Transaction } from "@/types";
import type { DashFilter } from "./dash-filter-bar";

interface Props {
  transactions: Transaction[];
  filter: DashFilter;
}

function buildDailyData(transactions: Transaction[], fromStr: string, toStr: string) {
  const days = eachDayOfInterval({ start: parseISO(fromStr), end: parseISO(toStr) });
  return days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const label = format(d, "dd/MM");
    const income  = transactions.filter((t) => t.type === "income"  && t.date === key).reduce((a, t) => a + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense" && t.date === key).reduce((a, t) => a + t.amount, 0);
    return { label, receita: income, despesa: expense, lucro: income - expense };
  });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const names: Record<string, string> = { receita: "Receita", despesa: "Despesas", lucro: "Lucro" };
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
          <span className="text-muted-foreground">{names[e.name] ?? e.name}:</span>
          <span className="font-medium text-foreground">{formatCurrency(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function DashRevenueTrend({ transactions, filter }: Props) {
  const { current, comparison } = useMemo(() => {
    const cur = buildDailyData(transactions, filter.from, filter.to);

    // Período comparativo: mesmo número de dias, janela anterior
    const from = parseISO(filter.from);
    const to   = parseISO(filter.to);
    const days = Math.max(cur.length - 1, 0);
    const prevTo   = format(subDays(from, 1), "yyyy-MM-dd");
    const prevFrom = format(subDays(from, days + 1), "yyyy-MM-dd");
    const prev = buildDailyData(transactions, prevFrom, prevTo);

    // Mescla: usa label do atual, adiciona prev_receita
    const merged = cur.map((d, i) => ({
      ...d,
      prev_receita: prev[i]?.receita ?? 0,
    }));

    return { current: merged, comparison: prev };
  }, [transactions, filter]);

  // Se mais de 31 dias, agrupa por semana (legibilidade)
  const data = useMemo(() => {
    if (current.length <= 31) return current;
    const weeks: typeof current = [];
    for (let i = 0; i < current.length; i += 7) {
      const chunk = current.slice(i, i + 7);
      weeks.push({
        label: chunk[0].label,
        receita:      chunk.reduce((a, d) => a + d.receita, 0),
        despesa:      chunk.reduce((a, d) => a + d.despesa, 0),
        lucro:        chunk.reduce((a, d) => a + d.lucro, 0),
        prev_receita: chunk.reduce((a, d) => a + (d.prev_receita ?? 0), 0),
      });
    }
    return weeks;
  }, [current]);

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Evolução do Faturamento</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(221,83%,53%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(221,83%,53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={36} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="receita"      name="Receita"           stroke="hsl(221,83%,53%)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="despesa"      name="Despesas"          stroke="hsl(0,72%,51%)"   strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="prev_receita" name="Receita (anterior)" stroke="hsl(221,83%,53%)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} opacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
