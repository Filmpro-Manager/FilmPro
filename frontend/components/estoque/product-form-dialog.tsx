"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validators";
import { maskCurrency, parseCurrency, maskDecimal, parseDecimal } from "@/lib/masks";
import type { Product } from "@/types";
import { useProductsStore, mapApiItemToProduct } from "@/store/products-store";
import { apiCreateInventoryItem, apiUpdateInventoryItem } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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
  const [rollWidthDisplay, setRollWidthDisplay] = useState("");

  // Tipo de medição: "m" = metros lineares (padrão) | "m2" = metros quadrados
  const [measurementType, setMeasurementType] = useState<"m" | "m2">("m");
  const [squareMetersDisplay, setSquareMetersDisplay] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: { type: "pelicula" },
  });

  const brand = useWatch({ control, name: "brand" });
  const model = useWatch({ control, name: "model" });
  const rollWidth = useWatch({ control, name: "rollWidth" });
  const productType = useWatch({ control, name: "type" });
  const requiresTransparency = productType === "pelicula" || productType === "ppf";
  const isAdesivo = productType === "adesivo";

  const COLORS = [
    "Transparente",
    "Branco",
    "Preto",
    "Prata",
    "Cromado",
    "Grafite",
    "Cinza",
    "Vermelho",
    "Vinho",
    "Laranja",
    "Amarelo",
    "Verde",
    "Verde Musgo",
    "Azul",
    "Azul Marinho",
    "Roxo",
    "Rosa",
    "Dourado",
    "Bronze",
    "Cobre",
    "Bege",
    "Marrom",
    "Caramelo",
  ];

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
        color: product.color,
        availableMeters: product.availableMeters,
        costPrice: product.costPrice,
        pricePerMeter: product.pricePerMeter,
        minimumStock: product.minimumStock,
        supplier: product.supplier,
        sku: product.sku,
        rollWidth: product.rollWidth,
      });
      setCostDisplay(maskCurrency(String(Math.round(product.costPrice * 100))));
      setPriceDisplay(maskCurrency(String(Math.round(product.pricePerMeter * 100))));
      setTransparencyDisplay(product.transparency != null ? String(product.transparency) : "");
      setMetersDisplay(maskDecimal(String(Math.round(product.availableMeters * 10)), 1));
      setMinStockDisplay(maskDecimal(String(Math.round(product.minimumStock * 10)), 1));
      setRollWidthDisplay(product.rollWidth != null ? maskDecimal(String(Math.round(product.rollWidth * 100))) : "");
    } else {
      reset({ type: "pelicula" });
      setCostDisplay("");
      setPriceDisplay("");
      setTransparencyDisplay("");
      setMetersDisplay("");
      setMinStockDisplay("");
      setRollWidthDisplay("");
    }
    setMeasurementType("m");
    setSquareMetersDisplay("");
  }, [product, reset, open]);

  // Recalcula metros lineares quando está no modo m² e rollWidth ou squareMeters mudam
  useEffect(() => {
    if (measurementType !== "m2") return;
    const sq = parseDecimal(squareMetersDisplay);
    const rw = rollWidth ?? 0;
    if (sq > 0 && rw > 0) {
      const linear = sq / rw;
      const rounded = Math.round(linear * 10) / 10;
      setMetersDisplay(maskDecimal(String(Math.round(rounded * 10)), 1));
      setValue("availableMeters", rounded, { shouldValidate: true });
    } else {
      setMetersDisplay("");
      setValue("availableMeters", 0, { shouldValidate: false });
    }
  }, [squareMetersDisplay, rollWidth, measurementType, setValue]);

  async function onSubmit(data: ProductInput) {
    try {
      const payload = {
        name: data.model,
        brand: data.brand,
        type: data.type,
        transparency: data.type !== "adesivo" ? data.transparency : undefined,
        color: data.type === "adesivo" ? data.color : undefined,
        quantity: data.availableMeters,
        minQuantity: data.minimumStock,
        costPrice: data.costPrice,
        pricePerUnit: data.pricePerMeter,
        sku: data.sku || undefined,
        rollWidth: data.rollWidth || undefined,
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
      setRollWidthDisplay("");
      setSquareMetersDisplay("");
      setMeasurementType("m");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : product ? "Erro ao atualizar material" : "Erro ao criar material");
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

  function handleDecimalField(
    raw: string,
    setDisplay: (v: string) => void,
    field: "availableMeters" | "minimumStock",
    decimals = 1
  ) {
    const masked = maskDecimal(raw, decimals);
    setDisplay(masked);
    setValue(field, parseDecimal(masked), { shouldValidate: true });
  }

  function handleSquareMeters(raw: string) {
    const masked = maskDecimal(raw, 2);
    setSquareMetersDisplay(masked);
  }

  function handleTransparency(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    const num = Math.min(100, parseInt(digits, 10) || 0);
    const display = digits === "" ? "" : String(num);
    setTransparencyDisplay(display);
    setValue("transparency", num, { shouldValidate: true });
  }

  // Calcula o equivalente no outro sistema para exibição
  const linearNum = parseDecimal(metersDisplay);
  const squareNum = parseDecimal(squareMetersDisplay);
  const rw = rollWidth ?? 0;

  const calcM2FromLinear = rw > 0 && linearNum > 0
    ? (linearNum * rw).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
  const calcLinearFromM2 = rw > 0 && squareNum > 0
    ? (squareNum / rw).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Material" : "Novo Material"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-1">

          {/* ── Identificação ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Marca" htmlFor="brand" error={errors.brand?.message}>
              <Input id="brand" placeholder="Llumar, 3M, Suntek..." {...register("brand")} />
            </FormField>

            <FormField label="Modelo" htmlFor="model" error={errors.model?.message}>
              <Input id="model" placeholder="ATR 15, Crystalline 40..." {...register("model")} />
            </FormField>

            <FormField label="Tipo" htmlFor="type">
              <Select
                defaultValue={product?.type ?? "pelicula"}
                onValueChange={(v) => {
                  setValue("type", v as ProductInput["type"]);
                  if (v === "adesivo") {
                    setValue("transparency", undefined, { shouldValidate: false });
                    setTransparencyDisplay("");
                  } else {
                    setValue("color", undefined, { shouldValidate: false });
                  }
                }}
              >
                <SelectTrigger id="type"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="adesivo">Adesivo</SelectItem>
                  <SelectItem value="pelicula">Película</SelectItem>
                  <SelectItem value="ppf">PPF</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {isAdesivo && (
              <FormField label="Cor" htmlFor="color" error={(errors as Record<string, {message?: string}>).color?.message}>
                <Select
                  defaultValue={product?.color ?? undefined}
                  onValueChange={(v) => setValue("color", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="color"><SelectValue placeholder="Selecione a cor" /></SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            {requiresTransparency && (
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
            )}
          </div>

          {/* ── Bobina e Estoque ── */}
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bobina e Quantidade</p>

            {/* Largura da bobina */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Largura da bobina" htmlFor="rollWidth" error={errors.rollWidth?.message}>
                <div className="relative">
                  <Input
                    id="rollWidth"
                  inputMode="numeric"
                  placeholder="1,52"
                  className="pr-10"
                  value={rollWidthDisplay}
                  onChange={(e) => {
                    const masked = maskDecimal(e.target.value);
                    setRollWidthDisplay(masked);
                    setValue("rollWidth", parseDecimal(masked) || undefined, { shouldValidate: true });
                  }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m</span>
                </div>
              </FormField>

              {/* Toggle de modo */}
              <FormField label="Inserir estoque em">
                <div className="flex h-9 rounded-md border border-input overflow-hidden text-sm">
                  <button
                    type="button"
                    onClick={() => { setMeasurementType("m"); setSquareMetersDisplay(""); }}
                    className={cn(
                      "flex-1 font-medium transition-colors px-3",
                      measurementType === "m"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    m linear
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMeasurementType("m2"); setMetersDisplay(""); setValue("availableMeters", 0, { shouldValidate: false }); }}
                    className={cn(
                      "flex-1 font-medium border-l border-input transition-colors px-3",
                      measurementType === "m2"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    m²
                  </button>
                </div>
              </FormField>
            </div>

            {/* Campos de quantidade — sempre side-by-side */}
            <div className="grid grid-cols-2 gap-4">
              {measurementType === "m" ? (
                <>
                  {/* Editável: metros lineares */}
                  <FormField label="Metros lineares" htmlFor="availableMeters" error={errors.availableMeters?.message}>
                    <div className="relative">
                      <Input
                        id="availableMeters"
                        inputMode="numeric"
                        placeholder="50,0"
                        className="pr-8"
                        value={metersDisplay}
                        onChange={(e) => handleDecimalField(e.target.value, setMetersDisplay, "availableMeters", 1)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m</span>
                    </div>
                  </FormField>

                  {/* Calculado: m² */}
                  <FormField label="Equivalente em m²">
                    <div className="relative">
                      <Input
                        readOnly
                        disabled
                        value={calcM2FromLinear}
                        className="bg-muted/60 cursor-default text-muted-foreground pr-10"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m²</span>
                    </div>
                    {!rw && linearNum > 0 && (
                      <p className="text-[11px] text-amber-600 mt-1">Informe a largura para calcular</p>
                    )}
                  </FormField>
                </>
              ) : (
                <>
                  {/* Editável: m² */}
                  <FormField label="Metros quadrados" htmlFor="squareMeters">
                    <div className="relative">
                      <Input
                        id="squareMeters"
                        inputMode="numeric"
                        placeholder="76,00"
                        className="pr-10"
                        value={squareMetersDisplay}
                        onChange={(e) => handleSquareMeters(e.target.value)}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m²</span>
                    </div>
                  </FormField>

                  {/* Calculado: metros lineares */}
                  <FormField label="Equivalente em metros lineares" error={errors.availableMeters?.message}>
                    <div className="relative">
                      <Input
                        readOnly
                        disabled
                        value={calcLinearFromM2}
                        className="bg-muted/60 cursor-default text-muted-foreground pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m</span>
                    </div>
                    {!rw && squareNum > 0 && (
                      <p className="text-[11px] text-amber-600 mt-1">Informe a largura para calcular</p>
                    )}
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* ── Preços ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <FormField label="Estoque mínimo (m)" htmlFor="minimumStock" error={errors.minimumStock?.message}>
              <div className="relative">
                <Input
                  id="minimumStock"
                  inputMode="numeric"
                  placeholder="20,0"
                  className="pr-8"
                  value={minStockDisplay}
                  onChange={(e) => handleDecimalField(e.target.value, setMinStockDisplay, "minimumStock", 1)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground pointer-events-none">m</span>
              </div>
            </FormField>

            <FormField label="SKU" htmlFor="sku" hint="Gerado automaticamente">
              <Input
                id="sku"
                placeholder="LLU-ATR15"
                {...register("sku")}
                readOnly
                className="bg-muted/50 cursor-not-allowed"
              />
            </FormField>

            <FormField label="Fornecedor" htmlFor="supplier" className="sm:col-span-2">
              <Input id="supplier" placeholder="Nome do fornecedor" {...register("supplier")} />
            </FormField>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Salvar Alterações" : "Cadastrar Material"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
