"use client";

import { useState, useMemo } from "react";
import { Plus, Target, TrendingUp, Users, ShoppingBag, Percent } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useGoalsStore } from "@/store/goals-store";
import { formatCurrency } from "@/lib/utils";
import type { Goal, GoalType } from "@/types";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<GoalType, string> = {
  revenue:         "Receita",
  services:        "Serviços",
  new_clients:     "Novos Clientes",
  ticket_average:  "Ticket Médio",
  conversion_rate: "Taxa de Conversão",
};

const TYPE_ICONS: Record<GoalType, React.ElementType> = {
  revenue:         TrendingUp,
  services:        ShoppingBag,
  new_clients:     Users,
  ticket_average:  Target,
  conversion_rate: Percent,
};

function GoalCard({ goal }: { goal: Goal }) {
  const pct = goal.progressPct ?? (goal.target > 0 ? Math.round((goal.achieved / goal.target) * 100) : 0);
  const isRevenue     = goal.type === "revenue" || goal.type === "ticket_average";
  const isPct         = goal.type === "conversion_rate";
  const formatValue   = (v: number) =>
    isRevenue ? formatCurrency(v) : isPct ? `${v.toFixed(1)}%` : v.toString();

  const color =
    pct >= 100 ? "text-green-500" :
    pct >= 70  ? "text-yellow-500" :
                 "text-destructive";

  const progressColor =
    pct >= 100 ? "bg-green-500" :
    pct >= 70  ? "bg-yellow-500" :
                 "bg-destructive";

  const Icon = TYPE_ICONS[goal.type];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-sm font-medium">{TYPE_LABELS[goal.type]}</CardTitle>
          </div>
          {goal.employeeName && (
            <Badge variant="secondary" className="text-xs">{goal.employeeName}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-end justify-between">
          <div>
            <p className={cn("text-2xl font-bold", color)}>
              {formatValue(goal.achieved)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatValue(goal.target)}
            </p>
          </div>
          <p className={cn("text-xl font-bold", color)}>{pct}%</p>
        </div>
        <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("absolute left-0 top-0 h-full rounded-full transition-all", progressColor)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Gera o período atual no formato AAAA-MM
const CURRENT_PERIOD = new Date().toISOString().slice(0, 7);

export default function MetasPage() {
  const [period, setPeriod] = useState(CURRENT_PERIOD);
  const goals = useGoalsStore((s) => s.goals);

  const companyGoals = useMemo(
    () => goals.filter((g) => g.period === period && !g.employeeId),
    [goals, period]
  );

  const individualGoals = useMemo(
    () => goals.filter((g) => g.period === period && !!g.employeeId),
    [goals, period]
  );

  // Resumo do período
  const summary = useMemo(() => {
    if (companyGoals.length === 0) return null;
    const hit = companyGoals.filter((g) => (g.progressPct ?? 0) >= 100).length;
    return { total: companyGoals.length, hit, pct: Math.round((hit / companyGoals.length) * 100) };
  }, [companyGoals]);

  // Lista de períodos disponíveis (últimos 6 meses)
  const periods = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toISOString().slice(0, 7);
    });
  }, []);

  const labelPeriod = (p: string) => {
    const [year, month] = p.split("-");
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    return `${months[parseInt(month) - 1]}/${year}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        description="Acompanhe os objetivos da empresa e da equipe"
      >
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Meta
        </Button>
      </PageHeader>

      {/* Seletor de período + resumo */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1 flex-wrap">
          {periods.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {labelPeriod(p)}
            </Button>
          ))}
        </div>
        {summary && (
          <p className="text-sm text-muted-foreground ml-auto">
            {summary.hit}/{summary.total} metas atingidas ({summary.pct}%)
          </p>
        )}
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Empresa</TabsTrigger>
          <TabsTrigger value="individual">Individual</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          {companyGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhuma meta definida para este período.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {companyGoals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="individual" className="mt-4">
          {individualGoals.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              Nenhuma meta individual definida para este período.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {individualGoals.map((g) => (
                <GoalCard key={g.id} goal={g} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
