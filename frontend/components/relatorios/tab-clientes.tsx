"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeClientes } from "./report-utils";
import { formatCurrency } from "@/lib/utils";
import { Users, UserCheck, UserX, Heart, TrendingUp, Star, DollarSign } from "lucide-react";
import type { Client, Appointment, ClientRating } from "@/types";
import type { ReportFilter } from "./report-utils";

const LIFECYCLE_COLOR: Record<string, string> = {
  active:   "hsl(142 76% 36%)",
  new:      "hsl(217 91% 60%)",
  at_risk:  "hsl(38 92% 50%)",
  inactive: "hsl(0 72% 51%)",
};
const LIFECYCLE_LABEL: Record<string, string> = {
  active:   "Ativo",
  new:      "Novo",
  at_risk:  "Em Risco",
  inactive: "Inativo",
};

interface TabClientesProps {
  clients: Client[];
  services: Appointment[];
  ratings: ClientRating[];
  filter: ReportFilter;
}

export function TabClientes({ clients, services, ratings, filter }: TabClientesProps) {
  const data = useMemo(() => computeClientes(clients, services, filter), [clients, services, filter]);

  // NPS calculation
  const npsData = useMemo(() => {
    if (ratings.length === 0) return null;
    const promoters  = ratings.filter((r) => r.score >= 9).length;
    const detractors = ratings.filter((r) => r.score <= 6).length;
    const nps = ratings.length > 0 ? Math.round(((promoters - detractors) / ratings.length) * 100) : 0;
    const avg = ratings.length > 0 ? ratings.reduce((a, r) => a + r.score, 0) / ratings.length : 0;
    return { nps, avg, promoters, detractors, passives: ratings.length - promoters - detractors, total: ratings.length };
  }, [ratings]);

  // lifecycle pie
  const lifecyclePie = useMemo(() => {
    const map: Record<string, number> = {};
    clients.forEach((c) => {
      const lc = c.lifecycle || "inactive";
      map[lc] = (map[lc] || 0) + 1;
    });
    return Object.entries(map).map(([key, count]) => ({
      name: LIFECYCLE_LABEL[key] || key,
      value: count,
      fill: LIFECYCLE_COLOR[key] || "hsl(var(--muted))",
    }));
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Total de Clientes" value={String(data.total)}       icon={Users}     />
        <ReportKpiCard label="Ativos"            value={String(data.active)}      icon={UserCheck} valueColor="green" />
        <ReportKpiCard label="Em Risco"          value={String(data.atRisk)}      icon={Heart}     valueColor="yellow" sub="sem comprar há 3 meses" />
        <ReportKpiCard label="Inativos"          value={String(data.inactive)}    icon={UserX}     valueColor="red"  sub="sem comprar há 6+ meses" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ReportKpiCard label="Novos no Período"  value={String(data.newClients)}  icon={TrendingUp} valueColor="blue" />
        <ReportKpiCard label="LTV Médio"         value={formatCurrency(data.avgLTV)} icon={DollarSign} valueColor="green" />
        <ReportKpiCard label="Freq. Contratação" value={`${data.avgFreq.toFixed(1)}×`} icon={TrendingUp} sub="serviços/cliente no período" />
      </div>

      {/* NPS */}
      {npsData && (
        <Card>
          <CardHeader><CardTitle className="text-sm">NPS — Avaliações dos Clientes</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div className="text-center">
                <p className={`text-3xl font-bold ${npsData.nps >= 50 ? "text-green-500" : npsData.nps >= 0 ? "text-yellow-500" : "text-destructive"}`}>
                  {npsData.nps > 0 ? "+" : ""}{npsData.nps}
                </p>
                <p className="text-xs text-muted-foreground mt-1">NPS Score</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{npsData.avg.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground mt-1">Nota média (0–10)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{npsData.promoters}</p>
                <p className="text-xs text-muted-foreground mt-1">Promotores (9–10)</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{npsData.detractors}</p>
                <p className="text-xs text-muted-foreground mt-1">Detratores (0–6)</p>
              </div>
            </div>
            {/* Recentes */}
            {ratings.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                <p className="text-xs font-medium text-muted-foreground">Avaliações recentes</p>
                {ratings.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-start gap-3 py-1.5 border-b border-border/30 last:border-0">
                    <span className={`mt-0.5 text-sm font-bold ${r.score >= 9 ? "text-green-500" : r.score >= 7 ? "text-yellow-500" : "text-destructive"}`}>
                      {r.score}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.clientName || "Cliente"}</p>
                      {r.comment && <p className="text-xs text-muted-foreground">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Ciclo de vida */}
        {lifecyclePie.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Ciclo de Vida dos Clientes</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={lifecyclePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${Number((percent ?? 0) * 100).toFixed(0)}%`}>
                    {lifecyclePie.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => `${v ?? 0} clientes`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top clientes */}
        {data.topClients.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Clientes que Mais Geram Receita</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.topClients.slice(0, 8).map((c, i) => (
                  <div key={c.name + i} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.count} serviços no período</p>
                    </div>
                    <span className="text-sm font-semibold text-green-500">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lista LTV */}
      <Card>
        <CardHeader><CardTitle className="text-sm">LTV — Valor por Cliente (Top 15)</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Cliente</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Total Gasto</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">LTV</th>
                </tr>
              </thead>
              <tbody>
                {clients
                  .slice()
                  .sort((a, b) => (b.ltv || b.totalSpent || 0) - (a.ltv || a.totalSpent || 0))
                  .slice(0, 15)
                  .map((c, i) => (
                    <tr key={c.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-2 pr-4 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-4">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Badge variant={c.lifecycle === "active" || c.lifecycle === "new" ? "success" : c.lifecycle === "at_risk" ? "warning" : "secondary"}>
                          {LIFECYCLE_LABEL[c.lifecycle || "inactive"]}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(c.totalSpent)}</td>
                      <td className="py-2 text-right font-semibold text-green-500">{formatCurrency(c.ltv || c.totalSpent || 0)}</td>
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
