"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";
import { useProductsStore } from "@/store/products-store";

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({ open, onOpenChange }: StockMovementDialogProps) {
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { products, updateProduct } = useProductsStore();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = Number(quantity.replace(",", "."));
    if (!productId || !qty) return;
    setLoading(true);
    const product = products.find((p) => p.id === productId);
    if (product) {
      const delta = type === "in" ? qty : -qty;
      updateProduct({
        ...product,
        availableMeters: Math.max(0, product.availableMeters + delta),
        updatedAt: new Date().toISOString(),
      });
    }
    setLoading(false);
    setProductId("");
    setQuantity("");
    setReason("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <FormField label="Película" htmlFor="product">
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecione a película" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.brand} {p.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Tipo" htmlFor="movType">
              <Select value={type} onValueChange={(v) => setType(v as "in" | "out")}>
                <SelectTrigger id="movType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Saída</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Quantidade (m)" htmlFor="quantity">
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="5.0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </FormField>
          </div>

          <FormField label="Motivo / Descrição" htmlFor="reason">
            <Textarea
              id="reason"
              placeholder="Reposição de estoque, serviço realizado..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
            />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !productId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
