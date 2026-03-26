"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const [dueDate, setDueDate] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [paidAmountDisplay, setPaidAmountDisplay] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState("5");
  const [recurMonths, setRecurMonths] = useState("12");

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
    setDueDate("");
    setIsPaid(true);
    setPaidAmountDisplay("");
    setType("income");
    setIsRecurring(false);
    setRecurrenceDay("5");
    setRecurMonths("12");
  }

  /** Gera data YYYY-MM-DD para o mês offset a partir de uma data base, ajustando dia */
  function shiftMonth(baseDate: string, offsetMonths: number, day: number): string {
    const [y, m] = baseDate.split("-").map(Number);
    const d = new Date(y, m - 1 + offsetMonths, 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const clampedDay = Math.min(day, lastDay);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseCurrency(amountDisplay);
    if (!amount || !description || !date || !category || !token) return;
    setLoading(true);
    try {
      const client = clientId ? clients.find((c) => c.id === clientId) : undefined;
      const months = isRecurring ? Math.max(1, Math.min(60, parseInt(recurMonths) || 12)) : 1;
      const day = parseInt(recurrenceDay) || 5;
      const recurRef = isRecurring ? crypto.randomUUID() : undefined;

      for (let i = 0; i < months; i++) {
        const txDate = isRecurring ? shiftMonth(date, i, day) : date;
        // Só o primeiro mês herda isPaid; os demais ficam pendentes
        const txIsPaid = i === 0 ? isPaid : false;
        const txPaidAmount = i === 0 && !isPaid ? (parseCurrency(paidAmountDisplay) || undefined) : undefined;

        const created = await apiCreateTransaction({
          type,
          description: isRecurring ? `${description} (${i + 1}/${months})` : description,
          amount,
          date: txDate,
          category,
          paymentMethod: paymentMethod || undefined,
          clientId: client?.id,
          clientName: client?.name,
          dueDate: dueDate || undefined,
          isPaid: txIsPaid,
          paidAmount: txPaidAmount,
          isRecurring,
          recurrenceDay: isRecurring ? day : undefined,
          installmentRef: recurRef,
          installments: isRecurring ? months : undefined,
          installmentNum: isRecurring ? i + 1 : undefined,
        }, token);

        addTransaction({
          id: created.id,
          type: created.type as "income" | "expense",
          description: created.description,
          amount: created.amount,
          date: created.date,
          dueDate: created.dueDate ?? undefined,
          isPaid: created.isPaid,
          paidAmount: created.paidAmount ?? undefined,
          category: created.category,
          paymentMethod: created.paymentMethod ?? undefined,
          clientId: created.clientId ?? undefined,
          clientName: created.clientName ?? undefined,
          isRecurring: created.isRecurring,
          recurrenceDay: created.recurrenceDay ?? undefined,
          installmentRef: created.installmentRef ?? undefined,
          installments: created.installments ?? undefined,
          installmentNum: created.installmentNum ?? undefined,
        });
      }

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

          {/* ── 1. Tipo ── */}
          <FormField label="Tipo" htmlFor="txType">
            <Select value={type} onValueChange={(v) => { setType(v as "income" | "expense"); setIsRecurring(false); }}>
              <SelectTrigger id="txType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* ── 2. Recorrência (despesas) — logo após o tipo ── */}
          {type === "expense" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch
                  id="txRecurring"
                  checked={isRecurring}
                  onCheckedChange={(v) => { setIsRecurring(v); if (v) setIsPaid(false); }}
                />
                <Label htmlFor="txRecurring" className="cursor-pointer select-none flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  Despesa recorrente (mensal)
                </Label>
              </div>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Dia de vencimento" htmlFor="txRecDay">
                    <Input
                      id="txRecDay"
                      type="number"
                      min={1}
                      max={31}
                      value={recurrenceDay}
                      onChange={(e) => setRecurrenceDay(e.target.value)}
                      placeholder="5"
                    />
                  </FormField>
                  <FormField label="Meses a criar" htmlFor="txRecMonths">
                    <Input
                      id="txRecMonths"
                      type="number"
                      min={1}
                      max={60}
                      value={recurMonths}
                      onChange={(e) => setRecurMonths(e.target.value)}
                      placeholder="12"
                    />
                  </FormField>
                </div>
              )}
              {isRecurring && (
                <p className="text-xs text-muted-foreground">
                  Serão criados <strong>{recurMonths || "?"} lançamentos</strong> a partir do mês da data selecionada, todo dia <strong>{recurrenceDay || "?"}</strong>. Todos iniciam como <strong>A Pagar</strong>.
                </p>
              )}
            </div>
          )}

          {/* ── 3. Descrição ── */}
          <FormField label="Descrição" htmlFor="txDesc">
            <Input
              id="txDesc"
              placeholder={isRecurring ? "Ex: Aluguel da loja, Conta de energia..." : "Descrição do lançamento"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </FormField>

          {/* ── 4. Valor + Data ── */}
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

            <FormField label={isRecurring ? "Mês de início" : "Data"} htmlFor="txDate">
              <Input
                id="txDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormField>
          </div>

          {/* ── 5. Categoria ── */}
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

          {/* ── 6. Forma de pagamento ── */}
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

          {/* ── 7. Cliente — apenas receitas ── */}
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

          {/* ── 8. Vencimento — oculto quando recorrente (o dia já define) ── */}
          {!isRecurring && (
            <FormField label="Vencimento (opcional)" htmlFor="txDueDate">
              <Input
                id="txDueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </FormField>
          )}

          {/* ── 9. Já foi pago — oculto quando recorrente ── */}
          {!isRecurring && (
            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="txIsPaid"
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
              <Label htmlFor="txIsPaid" className="cursor-pointer select-none">
                Já foi {type === "income" ? "recebido" : "pago"}
              </Label>
            </div>
          )}

          {/* ── 10. Valor parcial ── */}
          {!isRecurring && !isPaid && (
            <FormField label="Valor parcial já recebido (R$)" htmlFor="txPaidAmount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="txPaidAmount"
                  className="pl-9"
                  inputMode="decimal"
                  placeholder="0,00 — deixe em branco se ainda não recebeu"
                  value={paidAmountDisplay}
                  onChange={(e) => setPaidAmountDisplay(maskCurrency(e.target.value))}
                />
              </div>
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
