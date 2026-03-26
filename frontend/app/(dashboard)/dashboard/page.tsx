"use client";

import { useMemo, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import { useAuthStore } from "@/store/auth-store";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { DashFilterBar, buildFilter } from "@/components/dashboard/dash-filter-bar";
import { DashKpiCard } from "@/components/dashboard/dash-kpi-card";
import { DashRevenueTrend } from "@/components/dashboard/dash-revenue-trend";
import { DashOperacao } from "@/components/dashboard/dash-operacao";
import { DashComercial } from "@/components/dashboard/dash-comercial";
import { DashClientes } from "@/components/dashboard/dash-clientes";
import { DashEstoque } from "@/components/dashboard/dash-estoque";
import { DashAlertas } from "@/components/dashboard/dash-alertas";

import { useServicesStore } from "@/store/services-store";
import { useTransactionsStore } from "@/store/transactions-store";
import { useProductsStore } from "@/store/products-store";
import { useClientsStore } from "@/store/clients-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useQuotesStore } from "@/store/quotes-store";
import { useGoalsStore } from "@/store/goals-store";
import { useAlertsStore } from "@/store/alerts-store";

import type { Transaction } from "@/types";
import type { DashFilter } from "@/components/dashboard/dash-filter-bar";

// ─── KPI helpers ─────────────────────────────────────────────────────────────

function calcFinanceiro(transactions: Transaction[], from: string, to: string) {
  const inRange = transactions.filter((t) => t.date >= from && t.date <= to);

  const receita  = inRange.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const despesas = inRange.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
  const lucro    = receita - despesas;
  const margem   = receita > 0 ? (lucro / receita) * 100 : 0;

  // Caixa: saldo real do que foi efetivamente pago no período
  const caixaRec = inRange.filter((t) => t.type === "income"  && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
  const caixaPag = inRange.filter((t) => t.type === "expense" && t.isPaid).reduce((acc, t) => acc + t.amount, 0);
  const caixa    = caixaRec - caixaPag;

  const aReceber = inRange.filter((t) => t.type === "income"  && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);
  const aPagar   = inRange.filter((t) => t.type === "expense" && !t.isPaid).reduce((acc, t) => acc + t.amount, 0);

  return { receita, despesas, lucro, margem, caixa, aReceber, aPagar };
}

function trendPct(current: number, previous: number): number | undefined {
  if (previous === 0) return undefined;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function prevPeriod(filter: DashFilter): { from: string; to: string } {
  const d1 = new Date(filter.from);
  const d2 = new Date(filter.to);
  const days = Math.round((d2.getTime() - d1.getTime()) / 86_400_000) + 1;
  d1.setDate(d1.getDate() - days);
  d2.setDate(d2.getDate() - days);
  return {
    from: d1.toISOString().slice(0, 10),
    to:   d2.toISOString().slice(0, 10),
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<DashFilter>(() => buildFilter("mes"));

  const services     = useServicesStore((s) => s.services);
  const transactions = useTransactionsStore((s) => s.transactions);
  const products     = useProductsStore((s) => s.products);
  const clients      = useClientsStore((s) => s.clients);
  const employees    = useEmployeesStore((s) => s.employees);
  const quotes       = useQuotesStore((s) => s.quotes);
  const goals        = useGoalsStore((s) => s.goals);
  const alerts       = useAlertsStore((s) => s.alerts);

  const { cur, prev } = useMemo(() => {
    const pp = prevPeriod(filter);
    return {
      cur:  calcFinanceiro(transactions, filter.from, filter.to),
      prev: calcFinanceiro(transactions, pp.from, pp.to),
    };
  }, [transactions, filter]);

  // Funcionários têm um dashboard próprio, sem dados financeiros
  if (user?.role === "EMPLOYEE") {
    return <EmployeeDashboard />;
  }

  return (
    <div className="space-y-5">
      <DashFilterBar filter={filter} onChange={setFilter} />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        <DashKpiCard
          label="Receita"
          value={cur.receita}
          isCurrency
          trend={trendPct(cur.receita, prev.receita)}
          trendLabel="vs período anterior"
          icon={DollarSign}
          variant="default"
          size="lg"
        />
        <DashKpiCard
          label="Lucro Líquido"
          value={cur.lucro}
          isCurrency
          trend={trendPct(cur.lucro, prev.lucro)}
          trendLabel="vs período anterior"
          icon={TrendingUp}
          variant={cur.lucro >= 0 ? "success" : "destructive"}
          size="lg"
        />
        <DashKpiCard
          label="Margem"
          value={`${cur.margem.toFixed(1)}%`}
          trend={cur.margem - prev.margem}
          trendLabel="pp vs período anterior"
          icon={Percent}
          variant={cur.margem >= 30 ? "success" : cur.margem >= 15 ? "default" : "warning"}
          size="lg"
        />
        <DashKpiCard
          label="Saldo Caixa"
          value={cur.caixa}
          isCurrency
          icon={Wallet}
          variant={cur.caixa >= 0 ? "default" : "destructive"}
          sub="transações pagas"
          size="lg"
        />
        <DashKpiCard
          label="A Receber"
          value={cur.aReceber}
          isCurrency
          icon={ArrowDownCircle}
          variant="success"
          sub="cobranças pendentes"
          size="lg"
        />
        <DashKpiCard
          label="A Pagar"
          value={cur.aPagar}
          isCurrency
          icon={ArrowUpCircle}
          variant={cur.aPagar > cur.caixa ? "warning" : "default"}
          sub="despesas pendentes"
          size="lg"
        />
      </div>

      <DashRevenueTrend transactions={transactions} filter={filter} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <DashOperacao services={services} employees={employees} filter={filter} />
        <DashComercial services={services} quotes={quotes} goals={goals} filter={filter} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <DashClientes clients={clients} services={services} filter={filter} />
        <DashEstoque  products={products} services={services} filter={filter} />
        <DashAlertas  alerts={alerts} />
      </div>
    </div>
  );
}
