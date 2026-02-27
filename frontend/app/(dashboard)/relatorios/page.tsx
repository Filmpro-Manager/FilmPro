"use client";

import { useState, useMemo } from "react";
import { FileDown, Sheet, BarChart2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportFilterBar } from "@/components/relatorios/report-filter-bar";
import { TabFinanceiro } from "@/components/relatorios/tab-financeiro";
import { TabComercial } from "@/components/relatorios/tab-comercial";
import { TabOperacional } from "@/components/relatorios/tab-operacional";
import { TabEstoque } from "@/components/relatorios/tab-estoque";
import { TabClientes } from "@/components/relatorios/tab-clientes";
import { TabEstrategico } from "@/components/relatorios/tab-estrategico";
import { exportTransactionsCSV, exportServicesCSV, exportReportPDF } from "@/components/relatorios/export-utils";
import { useTransactionsStore } from "@/store/transactions-store";
import { useServicesStore } from "@/store/services-store";
import { useClientsStore } from "@/store/clients-store";
import { useEmployeesStore } from "@/store/employees-store";
import { useProductsStore } from "@/store/products-store";
import { useQuotesStore } from "@/store/quotes-store";
import { useGoalsStore } from "@/store/goals-store";
import { useRatingsStore } from "@/store/ratings-store";
import { useCompanyStore } from "@/store/company-store";
import { formatCurrency } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { ReportFilter } from "@/components/relatorios/report-utils";

const TAB_LABELS: Record<string, string> = {
  financeiro:  "Financeiro",
  comercial:   "Comercial",
  operacional: "Operacional",
  estoque:     "Estoque",
  clientes:    "Clientes",
  estrategico: "Estratégico",
};

export default function RelatoriosPage() {
  const [tab, setTab] = useState("financeiro");
  const [filter, setFilter] = useState<ReportFilter>({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    to:   format(endOfMonth(new Date()),   "yyyy-MM-dd"),
  });

  // Stores
  const transactions = useTransactionsStore((s) => s.transactions);
  const services     = useServicesStore((s) => s.services);
  const clients      = useClientsStore((s) => s.clients);
  const employees    = useEmployeesStore((s) => s.employees);
  const products     = useProductsStore((s) => s.products);
  const quotes       = useQuotesStore((s) => s.quotes);
  const goals        = useGoalsStore((s) => s.goals);
  const ratings      = useRatingsStore((s) => s.ratings);
  const { settings } = useCompanyStore();

  // Quick summary KPIs for header
  const headerKPIs = useMemo(() => {
    const inRange = transactions.filter((t) => t.date >= filter.from && t.date <= filter.to);
    const income   = inRange.filter((t) => t.type === "income").reduce((a, t) => a + t.amount, 0);
    const expense  = inRange.filter((t) => t.type === "expense").reduce((a, t) => a + t.amount, 0);
    const svcCount = services.filter((s) => s.date >= filter.from && s.date <= filter.to && s.status === "completed").length;
    return { income, expense, profit: income - expense, svcCount };
  }, [transactions, services, filter]);

  function handleExportCSV() {
    if (tab === "financeiro") exportTransactionsCSV(transactions, filter.from, filter.to);
    else exportServicesCSV(services, filter.from, filter.to);
  }

  function handleExportPDF() {
    exportReportPDF({
      title: `Relatório ${TAB_LABELS[tab]} — ${filter.from} a ${filter.to}`,
      subtitle: `Período: ${filter.from} até ${filter.to}`,
      companyName: settings?.tradeName || settings?.name || "Empresa",
      kpis: [
        { label: "Receita",    value: formatCurrency(headerKPIs.income) },
        { label: "Despesas",   value: formatCurrency(headerKPIs.expense) },
        { label: "Resultado",  value: formatCurrency(headerKPIs.profit) },
        { label: "Serviços",   value: String(headerKPIs.svcCount) },
      ],
      tableHeaders: [],
      tableRows: [],
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios Gerenciais" description="Visão estratégica, financeira e operacional do negócio">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExportCSV}>
            <Sheet className="h-3.5 w-3.5" />
            Exportar CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-8 text-xs" onClick={handleExportPDF}>
            <FileDown className="h-3.5 w-3.5" />
            Exportar PDF
          </Button>
        </div>
      </PageHeader>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <ReportFilterBar
          filter={filter}
          onChange={setFilter}
          employees={employees}
          clients={clients}
        />
      </div>

      {/* KPI strip rápido */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-fade-in">
        {[
          { label: "Receita no Período",  value: formatCurrency(headerKPIs.income),   color: "text-green-500" },
          { label: "Despesas no Período", value: formatCurrency(headerKPIs.expense),  color: "text-destructive" },
          { label: "Resultado",           value: formatCurrency(headerKPIs.profit),   color: headerKPIs.profit >= 0 ? "text-green-500" : "text-destructive" },
          { label: "Serviços Realizados", value: String(headerKPIs.svcCount),         color: "text-primary" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Abas */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          {Object.entries(TAB_LABELS).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-xs">
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="financeiro" className="mt-4">
          <TabFinanceiro transactions={transactions} filter={filter} />
        </TabsContent>

        <TabsContent value="comercial" className="mt-4">
          <TabComercial
            services={services}
            quotes={quotes}
            goals={goals}
            employees={employees}
            filter={filter}
          />
        </TabsContent>

        <TabsContent value="operacional" className="mt-4">
          <TabOperacional services={services} filter={filter} />
        </TabsContent>

        <TabsContent value="estoque" className="mt-4">
          <TabEstoque products={products} services={services} filter={filter} />
        </TabsContent>

        <TabsContent value="clientes" className="mt-4">
          <TabClientes clients={clients} services={services} ratings={ratings} filter={filter} />
        </TabsContent>

        <TabsContent value="estrategico" className="mt-4">
          <TabEstrategico transactions={transactions} services={services} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
