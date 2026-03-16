"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validators";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import type { Product } from "@/types";
import { useProductsStore, mapApiItemToProduct } from "@/store/products-store";
import { apiCreateInventoryItem, apiUpdateInventoryItem } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";

function generateSku(brand: string, model: string): string {
  const b = brand.replace(/\s+/g, "").toUpperCase().slice(0, 3);
  const m = model.replace(/\s+/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  if (!b && !m) return "";
  return `${b}-${m}`;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const skuManuallyEdited = useRef(false);
  const { addProduct, updateProduct } = useProductsStore();
  const token = useAuthStore((s) => s.token) ?? "";

  // Estado de display para campos com máscara
  const [costDisplay, setCostDisplay] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [transparencyDisplay, setTransparencyDisplay] = useState("");
  const [metersDisplay, setMetersDisplay] = useState("");
  const [minStockDisplay, setMinStockDisplay] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: { type: "automotive" },
  });

  const brand = useWatch({ control, name: "brand" });
  const model = useWatch({ control, name: "model" });

  useEffect(() => {
    if (!skuManuallyEdited.current) {
      setValue("sku", generateSku(brand ?? "", model ?? ""));
    }
  }, [brand, model, setValue]);

  useEffect(() => {
    skuManuallyEdited.current = false;
    if (product) {
      reset({
        brand: product.brand,
        model: product.model,
        type: product.type,
        transparency: product.transparency,
        availableMeters: product.availableMeters,
        costPrice: product.costPrice,
        pricePerMeter: product.pricePerMeter,
        minimumStock: product.minimumStock,
        supplier: product.supplier,
        sku: product.sku,
      });
      setCostDisplay(maskCurrency(String(Math.round(product.costPrice * 100))));
      setPriceDisplay(maskCurrency(String(Math.round(product.pricePerMeter * 100))));
      setTransparencyDisplay(String(product.transparency));
      setMetersDisplay(String(product.availableMeters));
      setMinStockDisplay(String(product.minimumStock));
    } else {
      reset({ type: "automotive" });
      setCostDisplay("");
      setPriceDisplay("");
      setTransparencyDisplay("");
      setMetersDisplay("");
      setMinStockDisplay("");
    }
  }, [product, reset, open]);

  async function onSubmit(data: ProductInput) {
    try {
      const payload = {
        name: data.model,
        brand: data.brand,
        type: data.type,
        transparency: data.transparency,
        quantity: data.availableMeters,
        minQuantity: data.minimumStock,
        costPrice: data.costPrice,
        pricePerUnit: data.pricePerMeter,
        sku: data.sku || undefined,
      };

      if (product) {
        const updated = await apiUpdateInventoryItem(product.id, payload, token);
        updateProduct(mapApiItemToProduct(updated));
      } else {
        const created = await apiCreateInventoryItem(payload, token);
        addProduct(mapApiItemToProduct(created));
      }
      reset();
      setCostDisplay("");
      setPriceDisplay("");
      setTransparencyDisplay("");
      setMetersDisplay("");
      setMinStockDisplay("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : product ? "Erro ao atualizar película" : "Erro ao criar película");
    }
  }

  function handleCurrencyChange(
    raw: string,
    setDisplay: (v: string) => void,
    field: "costPrice" | "pricePerMeter"
  ) {
    const masked = maskCurrency(raw);
    setDisplay(masked);
    setValue(field, parseCurrency(masked), { shouldValidate: true });
  }

  function handlePositiveDecimal(
    raw: string,
    setDisplay: (v: string) => void,
    field: "availableMeters" | "minimumStock",
    decimals = 1
  ) {
    // Permite apenas dígitos e ponto/vírgula
    const clean = raw.replace(/[^0-9.,]/g, "").replace(",", ".");
    // Evita múltiplos pontos
    const parts = clean.split(".");
    const normalized = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : clean;
    // Limita casas decimais
    const [int, dec] = normalized.split(".");
    const display = dec !== undefined ? `${int}.${dec.slice(0, decimals)}` : normalized;
    setDisplay(display);
    const num = parseFloat(display);
    setValue(field, isNaN(num) ? 0 : Math.max(0, num), { shouldValidate: true });
  }

  function handleTransparency(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    const num = Math.min(100, parseInt(digits, 10) || 0);
    const display = digits === "" ? "" : String(num);
    setTransparencyDisplay(display);
    setValue("transparency", num, { shouldValidate: true });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Película" : "Nova Película"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Marca */}
            <FormField label="Marca" htmlFor="brand" error={errors.brand?.message}>
              <Input id="brand" placeholder="Llumar, 3M, Suntek..." {...register("brand")} />
            </FormField>

            {/* Modelo */}
            <FormField label="Modelo" htmlFor="model" error={errors.model?.message}>
              <Input id="model" placeholder="ATR 15, Crystalline 40..." {...register("model")} />
            </FormField>

            {/* Tipo */}
            <FormField label="Tipo" htmlFor="type">
              <Select
                defaultValue={product?.type ?? "automotive"}
                onValueChange={(v) => setValue("type", v as ProductInput["type"])}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automotive">Automotiva</SelectItem>
                  <SelectItem value="architecture">Arquitetônica</SelectItem>
                  <SelectItem value="security">Segurança</SelectItem>
                  <SelectItem value="decorative">Decorativa</SelectItem>
                  <SelectItem value="solar">Solar</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {/* Transparência */}
            <FormField label="Transparência" htmlFor="transparency" error={errors.transparency?.message}>
              <div className="relative">
                <Input
                  id="transparency"
                  inputMode="numeric"
                  placeholder="15"
                  className="pr-8"
                  value={transparencyDisplay}
                  onChange={(e) => handleTransparency(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>
              </div>
            </FormField>

            {/* Metragem disponível */}
            <FormField label="Metragem disponível (m)" htmlFor="availableMeters" error={errors.availableMeters?.message}>
              <Input
                id="availableMeters"
                inputMode="decimal"
                placeholder="50,0"
                value={metersDisplay}
                onChange={(e) => handlePositiveDecimal(e.target.value, setMetersDisplay, "availableMeters")}
              />
            </FormField>

            {/* Custo */}
            <FormField label="Custo por metro" htmlFor="costPrice" error={errors.costPrice?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="costPrice"
                  inputMode="numeric"
                  placeholder="45,00"
                  className="pl-9"
                  value={costDisplay}
                  onChange={(e) => handleCurrencyChange(e.target.value, setCostDisplay, "costPrice")}
                />
              </div>
            </FormField>

            {/* Preço de venda */}
            <FormField label="Venda por metro" htmlFor="pricePerMeter" error={errors.pricePerMeter?.message}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">R$</span>
                <Input
                  id="pricePerMeter"
                  inputMode="numeric"
                  placeholder="85,00"
                  className="pl-9"
                  value={priceDisplay}
                  onChange={(e) => handleCurrencyChange(e.target.value, setPriceDisplay, "pricePerMeter")}
                />
              </div>
            </FormField>

            {/* Estoque mínimo */}
            <FormField label="Estoque mínimo (m)" htmlFor="minimumStock" error={errors.minimumStock?.message}>
              <Input
                id="minimumStock"
                inputMode="decimal"
                placeholder="20"
                value={minStockDisplay}
                onChange={(e) => handlePositiveDecimal(e.target.value, setMinStockDisplay, "minimumStock")}
              />
            </FormField>

            {/* SKU */}
            <FormField label="SKU" htmlFor="sku" hint="Gerado automaticamente">
              <Input
                id="sku"
                placeholder="LLU-ATR15"
                {...register("sku")}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </FormField>

            {/* Fornecedor */}
            <FormField label="Fornecedor" htmlFor="supplier" className="sm:col-span-2">
              <Input id="supplier" placeholder="Nome do fornecedor" {...register("supplier")} />
            </FormField>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Salvar Alterações" : "Cadastrar Película"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
