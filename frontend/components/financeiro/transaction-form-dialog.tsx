"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { useTransactionsStore } from "@/store/transactions-store";
import { useClientsStore } from "@/store/clients-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateTransaction } from "@/lib/api";
import { maskCurrency, parseCurrency } from "@/lib/masks";

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = {
  income: ["Serviço Automotivo", "Serviço Residencial", "Serviço de Segurança", "Outros"],
  expense: ["Compra de Material", "Despesa Fixa", "Manutenção", "Marketing", "Pessoal", "Outros"],
};

const PAYMENT_METHODS = ["PIX", "Dinheiro", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Transferência"];

export function TransactionFormDialog({ open, onOpenChange }: TransactionFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"income" | "expense">("income");
  const [description, setDescription] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [clientId, setClientId] = useState("");

  const { addTransaction } = useTransactionsStore();
  const clients = useClientsStore((s) => s.clients);
  const { token } = useAuthStore();

  function reset() {
    setDescription("");
    setAmountDisplay("");
    setDate("");
    setCategory("");
    setPaymentMethod("");
    setClientId("");
    setType("income");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseCurrency(amountDisplay);
    if (!amount || !description || !date || !category || !token) return;
    setLoading(true);
    try {
      const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
      const created = await apiCreateTransaction({
        type,
        description,
        amount,
        date,
        category,
        paymentMethod: paymentMethod || undefined,
        clientId: client?.id,
        clientName: client?.name,
      }, token);
      addTransaction({
        id: created.id,
        type: created.type as "income" | "expense",
        description: created.description,
        amount: created.amount,
        date: created.date,
        dueDate: created.dueDate ?? undefined,
        isPaid: created.isPaid,
        category: created.category,
        paymentMethod: created.paymentMethod ?? undefined,
        clientId: created.clientId ?? undefined,
        clientName: created.clientName ?? undefined,
      });
      reset();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Lançamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <FormField label="Tipo" htmlFor="txType">
            <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
              <SelectTrigger id="txType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Descrição" htmlFor="txDesc">
            <Input
              id="txDesc"
              placeholder="Descrição do lançamento"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Valor (R$)" htmlFor="txAmount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="txAmount"
                  className="pl-9"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={amountDisplay}
                  onChange={(e) => setAmountDisplay(maskCurrency(e.target.value))}
                  required
                />
              </div>
            </FormField>

            <FormField label="Data" htmlFor="txDate">
              <Input
                id="txDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Categoria" htmlFor="txCategory">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="txCategory">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES[type].map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField label="Forma de pagamento" htmlFor="txPayment">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="txPayment">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          {type === "income" && (
            <FormField label="Cliente (opcional)" htmlFor="txClient">
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="txClient">
                  <SelectValue placeholder="Vincular cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
