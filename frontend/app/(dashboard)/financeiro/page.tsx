"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown, Trash2, CheckCircle2, Clock, AlertCircle, CircleDollarSign, Edit2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TransactionFormDialog } from "@/components/financeiro/transaction-form-dialog";
import { useTransactionsStore } from "@/store/transactions-store";
import { useAuthStore } from "@/store/auth-store";
import { apiDeleteTransaction, apiGetTransactions, apiUpdateTransaction, type ApiTransaction } from "@/lib/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import type { Transaction, TableColumn } from "@/types";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type PayStatus = "paid" | "partial" | "overdue" | "pending";

function payStatus(t: Transaction): PayStatus {
  if (t.isPaid) return "paid";
  if (t.paidAmount && t.paidAmount > 0) return "partial";
  if (t.dueDate && new Date(t.dueDate + "T23:59:59") < new Date()) return "overdue";
  return "pending";
}

const PAY_BADGE: Record<PayStatus, { label: string; className: string }> = {
  paid:    { label: "Pago",       className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400" },
  partial: { label: "Parcial",    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  overdue: { label: "Vencido",    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  pending: { label: "A Receber",  className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400" },
};

function mapApiTransaction(api: ApiTransaction): Transaction {
  return {
    id: api.id,
    type: api.type as "income" | "expense",
    description: api.description,
    amount: api.amount,
    date: api.date,
    dueDate: api.dueDate ?? undefined,
    paidDate: api.paidDate ?? undefined,
    isPaid: api.isPaid,
    paidAmount: api.paidAmount ?? undefined,
    category: api.category,
    paymentMethod: api.paymentMethod ?? undefined,
    clientId: api.clientId ?? undefined,
    clientName: api.clientName ?? undefined,
  };
}

// ─── Mark Paid Dialog ─────────────────────────────────────────────────────────

function MarkPaidDialog({
  transaction,
  open,
  onOpenChange,
  onConfirm,
}: {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (amount: number, full: boolean) => void;
}) {
  const [amountDisplay, setAmountDisplay] = useState("");

  useEffect(() => {
    if (transaction) setAmountDisplay(transaction.amount.toFixed(2).replace(".", ","));
  }, [transaction]);

  if (!transaction) return null;
  const entered = parseCurrency(amountDisplay) ?? 0;
  const isFull = entered >= transaction.amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{transaction.description}</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor total</span>
            <span className="font-semibold">{formatCurrency(transaction.amount)}</span>
          </div>
          {transaction.paidAmount && transaction.paidAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Já recebido</span>
              <span className="font-semibold text-emerald-600">{formatCurrency(transaction.paidAmount)}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Valor recebido agora (R$)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
              <Input
                className="pl-9"
                inputMode="decimal"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(maskCurrency(e.target.value))}
              />
            </div>
            {!isFull && entered > 0 && (
              <p className="text-xs text-amber-600">Faltam {formatCurrency(transaction.amount - entered)} → será marcado como Parcial</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={entered <= 0} onClick={() => onConfirm(entered, isFull)}>
            {isFull ? "Marcar como Pago" : "Salvar Parcial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [openForm, setOpenForm] = useState(false);
  const [tab, setTab] = useState("all");
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const deleteTransaction = useTransactionsStore((s) => s.deleteTransaction);
  const updateTransaction = useTransactionsStore((s) => s.updateTransaction);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<Transaction | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) return;
    apiGetTransactions(token)
      .then((data) => setTransactions(data.map(mapApiTransaction)))
      .catch(() => {});
  }, [token]);

  const stats = useMemo(() => {
    const income = transactions.filter((t) => t.type === "income");
    const expense = transactions.filter((t) => t.type === "expense");
    const totalIncome = income.reduce((a, t) => a + t.amount, 0);
    const totalExpense = expense.reduce((a, t) => a + t.amount, 0);
    const toReceive = income.filter((t) => !t.isPaid).reduce((a, t) => a + (t.amount - (t.paidAmount ?? 0)), 0);
    const overdue = income.filter((t) => payStatus(t) === "overdue").reduce((a, t) => a + t.amount, 0);
    const toPay = expense.filter((t) => !t.isPaid).reduce((a, t) => a + t.amount, 0);
    return { totalIncome, totalExpense, net: totalIncome - totalExpense, toReceive, overdue, toPay };
  }, [transactions]);

  const filtered = useMemo(() => {
    switch (tab) {
      case "income":    return transactions.filter((t) => t.type === "income");
      case "expense":   return transactions.filter((t) => t.type === "expense");
      case "toReceive": return transactions.filter((t) => t.type === "income" && !t.isPaid);
      case "toPay":     return transactions.filter((t) => t.type === "expense" && !t.isPaid);
      case "overdue":   return transactions.filter((t) => payStatus(t) === "overdue");
      case "paid":      return transactions.filter((t) => t.isPaid);
      default:          return transactions;
    }
  }, [tab, transactions]);

  async function handleMarkPaid(amount: number, full: boolean) {
    if (!markPaidTarget || !token) return;
    const prevPaid = markPaidTarget.paidAmount ?? 0;
    const totalPaid = prevPaid + amount;
    const isFull = full || totalPaid >= markPaidTarget.amount;
    const updated = await apiUpdateTransaction(markPaidTarget.id, {
      isPaid: isFull,
      paidAmount: isFull ? undefined : totalPaid,
      paidDate: isFull ? new Date().toISOString().slice(0, 10) : undefined,
    }, token).catch(() => null);
    if (updated) {
      updateTransaction({ ...markPaidTarget, isPaid: isFull, paidAmount: isFull ? undefined : totalPaid, paidDate: isFull ? new Date().toISOString().slice(0, 10) : undefined });
    }
    setMarkPaidTarget(null);
  }

  const columns: TableColumn<Transaction>[] = [
    {
      key: "date",
      header: "Competência",
      render: (row) => (
        <div>
          <p className="text-sm text-muted-foreground">{formatDate(row.date)}</p>
          {row.dueDate && (
            <p className={cn("text-xs", payStatus(row) === "overdue" ? "text-destructive font-medium" : "text-muted-foreground")}>
              Venc.: {formatDate(row.dueDate)}
            </p>
          )}
        </div>
      ),
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
      render: (row) => <Badge variant="secondary" className="text-xs">{row.category}</Badge>,
    },
    {
      key: "amount",
      header: "Valor",
      render: (row) => (
        <div className="text-right">
          <p className={cn("font-semibold text-sm", row.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
            {row.type === "income" ? "+" : "-"}{formatCurrency(row.amount)}
          </p>
          {row.paidAmount && row.paidAmount > 0 && !row.isPaid && (
            <p className="text-xs text-amber-600">{formatCurrency(row.paidAmount)} recebido</p>
          )}
        </div>
      ),
      className: "text-right",
    },
    {
      key: "isPaid",
      header: "Status",
      render: (row) => {
        const s = payStatus(row);
        const b = PAY_BADGE[s];
        return (
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", b.className)}>
            {s === "paid" && <CheckCircle2 className="w-3 h-3" />}
            {s === "partial" && <Edit2 className="w-3 h-3" />}
            {s === "overdue" && <AlertCircle className="w-3 h-3" />}
            {s === "pending" && <Clock className="w-3 h-3" />}
            {b.label}
          </span>
        );
      },
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {!row.isPaid && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              title="Marcar como pago"
              onClick={() => setMarkPaidTarget(row)}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget({ id: row.id, name: row.description })}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
      className: "text-right w-20",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Financeiro" description="Controle de receitas, despesas e contas a receber/pagar">
        <Button size="sm" onClick={() => setOpenForm(true)}>
          <Plus className="h-4 w-4" />
          Novo Lançamento
        </Button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-destructive/10 shrink-0">
                <TrendingDown className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-base font-semibold text-destructive">{formatCurrency(stats.totalExpense)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0", stats.net >= 0 ? "bg-primary/10" : "bg-destructive/10")}>
                <CircleDollarSign className={cn("w-4 h-4", stats.net >= 0 ? "text-primary" : "text-destructive")} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={cn("text-base font-semibold", stats.net >= 0 ? "text-primary" : "text-destructive")}>{formatCurrency(stats.net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-2 cursor-pointer hover:border-sky-300 transition-colors" onClick={() => setTab("toReceive")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/30 shrink-0">
                <Clock className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A Receber</p>
                <p className="text-base font-semibold text-sky-600 dark:text-sky-400">{formatCurrency(stats.toReceive)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-1 lg:col-span-2 cursor-pointer hover:border-red-300 transition-colors" onClick={() => setTab("overdue")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 shrink-0">
                <AlertCircle className="w-4 h-4 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencido</p>
                <p className="text-base font-semibold text-destructive">{formatCurrency(stats.overdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-2 cursor-pointer hover:border-amber-300 transition-colors" onClick={() => setTab("toPay")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">A Pagar</p>
                <p className="text-base font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(stats.toPay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="toReceive" className="gap-1">
              A Receber
              {stats.toReceive > 0 && <span className="text-[10px] bg-sky-500 text-white rounded-full px-1.5 py-0.5 ml-0.5">{transactions.filter(t => t.type === "income" && !t.isPaid).length}</span>}
            </TabsTrigger>
            <TabsTrigger value="toPay" className="gap-1">
              A Pagar
              {stats.toPay > 0 && <span className="text-[10px] bg-amber-500 text-white rounded-full px-1.5 py-0.5 ml-0.5">{transactions.filter(t => t.type === "expense" && !t.isPaid).length}</span>}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="gap-1">
              Vencidos
              {stats.overdue > 0 && <span className="text-[10px] bg-destructive text-white rounded-full px-1.5 py-0.5 ml-0.5">{transactions.filter(t => payStatus(t) === "overdue").length}</span>}
            </TabsTrigger>
            <TabsTrigger value="paid">Pagos</TabsTrigger>
            <TabsTrigger value="income">Receitas</TabsTrigger>
            <TabsTrigger value="expense">Despesas</TabsTrigger>
          </TabsList>
          <span className="text-xs text-muted-foreground shrink-0">{filtered.length} lançamentos</span>
        </div>

        <TabsContent value={tab} className="mt-4">
          <DataTable columns={columns} data={filtered} keyField="id" />
        </TabsContent>
      </Tabs>

      <TransactionFormDialog open={openForm} onOpenChange={setOpenForm} />

      <MarkPaidDialog
        transaction={markPaidTarget}
        open={!!markPaidTarget}
        onOpenChange={(v) => !v && setMarkPaidTarget(null)}
        onConfirm={handleMarkPaid}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="lançamento"
        onConfirm={async () => {
          if (deleteTarget && token) {
            await apiDeleteTransaction(deleteTarget.id, token).catch(() => {});
            deleteTransaction(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
