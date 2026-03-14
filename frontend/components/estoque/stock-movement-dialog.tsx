"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { useProductsStore, mapApiItemToProduct } from "@/store/products-store";
import { apiCreateMovement, apiGetInventoryItems } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";

const schema = z.object({
  inventoryItemId: z.string().min(1, "Selecione uma película"),
  type: z.enum(["entrada", "saida"]),
  quantity: z.coerce
    .number({ invalid_type_error: "Informe uma quantidade válida" })
    .positive("A quantidade deve ser maior que zero"),
  reason: z.string().min(1, "O motivo é obrigatório"),
});

type FormValues = z.infer<typeof schema>;

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockMovementDialog({ open, onOpenChange }: StockMovementDialogProps) {
  const { products, setProducts } = useProductsStore();
  const token = useAuthStore((s) => s.token) ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: "entrada", inventoryItemId: "", reason: "" },
  });

  const watchedType = watch("type");
  const watchedProductId = watch("inventoryItemId");
  const selectedProduct = products.find((p) => p.id === watchedProductId);

  async function onSubmit(data: FormValues) {
    if (data.type === "saida" && selectedProduct && data.quantity > selectedProduct.availableMeters) {
      setError("quantity", {
        message: `Estoque insuficiente. Disponível: ${selectedProduct.availableMeters.toFixed(2).replace(".", ",")} m`,
      });
      return;
    }

    try {
      await apiCreateMovement(data, token);
      const items = await apiGetInventoryItems(token);
      setProducts(items.map(mapApiItemToProduct));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao registrar movimentação");
    }
  }

  function handleOpenChange(open: boolean) {
    if (!open) reset();
    onOpenChange(open);
  }

  const availableHint =
    watchedType === "saida" && selectedProduct
      ? `Disponível: ${selectedProduct.availableMeters.toFixed(2).replace(".", ",")} m`
      : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Movimentação</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <FormField label="Película" htmlFor="inventoryItemId" error={errors.inventoryItemId?.message}>
            <Select
              value={watchedProductId ?? ""}
              onValueChange={(v) => setValue("inventoryItemId", v, { shouldValidate: true })}
            >
              <SelectTrigger id="inventoryItemId">
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
              <Select
                value={watchedType}
                onValueChange={(v) => setValue("type", v as "entrada" | "saida", { shouldValidate: true })}
              >
                <SelectTrigger id="movType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="Quantidade (m)" htmlFor="quantity" error={errors.quantity?.message} hint={availableHint}>
              <Input
                id="quantity"
                type="number"
                step="0.1"
                min="0.1"
                placeholder="5.0"
                {...register("quantity")}
              />
            </FormField>
          </div>

          <FormField label="Motivo / Descrição" htmlFor="reason" error={errors.reason?.message}>
            <Textarea
              id="reason"
              placeholder="Reposição de estoque, serviço realizado..."
              rows={2}
              {...register("reason")}
            />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
