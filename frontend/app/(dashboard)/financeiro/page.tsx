"use client";

import { useState, useMemo } from "react";
import { Plus, TrendingUp, TrendingDown, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TransactionFormDialog } from "@/components/financeiro/transaction-form-dialog";
import { useTransactionsStore } from "@/store/transactions-store";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction, TableColumn } from "@/types";
import { cn } from "@/lib/utils";

export default function FinanceiroPage() {
  const [openForm, setOpenForm] = useState(false);
  const [tab, setTab] = useState("all");
  const transactions = useTransactionsStore((s) => s.transactions);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (tab === "income") return transactions.filter((t) => t.type === "income");
    if (tab === "expense") return transactions.filter((t) => t.type === "expense");
    return transactions;
  }, [tab, transactions]);

  const columns: TableColumn<Transaction>[] = [
    {
      key: "date",
      header: "Data",
      render: (row) => <span className="text-muted-foreground">{formatDate(row.date)}</span>,
    },
    {
      key: "description",
      header: "Descrição",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.description}</p>
          {row.clientName && <p className="text-xs text-muted-foreground">{row.clientName}</p>}
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (row) => <Badge variant="secondary">{row.category}</Badge>,
    },
    {
      key: "paymentMethod",
      header: "Pagamento",
      render: (row) => <span className="text-muted-foreground text-sm">{row.paymentMethod ?? "—"}</span>,
    },
    {
      key: "amount",
      header: "Valor",
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          {row.type === "income" ? (
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          <span
            className={cn(
              "font-semibold",
              row.type === "income"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            {row.type === "income" ? "+" : "-"}
            {formatCurrency(row.amount)}
          </span>
        </div>
      ),
      className: "text-right",
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => setDeleteTarget({ id: row.id, name: row.description })}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      ),
      className: "text-right w-10",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" description="Controle de receitas, despesas e fluxo de caixa">
        <Button size="sm" onClick={() => setOpenForm(true)}>
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.income)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-destructive/10">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-lg font-semibold text-destructive">
                  {formatCurrency(stats.expense)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl",
                stats.net >= 0 ? "bg-primary/10" : "bg-destructive/10"
              )}>
                <TrendingUp className={cn("w-4 h-4", stats.net >= 0 ? "text-primary" : "text-destructive")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Líquido</p>
                <p className={cn(
                  "text-lg font-semibold",
                  stats.net >= 0 ? "text-primary" : "text-destructive"
                )}>
                  {formatCurrency(stats.net)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground">
            {filtered.length} lançamentos
          </span>
        </div>

        <TabsContent value={tab} className="mt-4">
          <DataTable columns={columns} data={filtered} keyField="id" />
        </TabsContent>
      </Tabs>

      <TransactionFormDialog open={openForm} onOpenChange={setOpenForm} />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="lançamento"
        onConfirm={() => { if (deleteTarget) deleteTransaction(deleteTarget.id); }}
      />
    </div>
  );
}
