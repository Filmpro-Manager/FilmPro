"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { serviceCatalogSchema, type ServiceCatalogInput } from "@/lib/validators";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import type { ServiceCatalog } from "@/types";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { FormField } from "@/components/shared/form-field";

const CATEGORY_LABELS: Record<string, string> = {
  automotive: "Automotivo",
  architecture: "Arquitetura",
};

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceCatalog | null;
}

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const [valueDisplay, setValueDisplay] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ServiceCatalogInput>({
    resolver: zodResolver(serviceCatalogSchema),
    defaultValues: { isActive: true },
  });

  const addService  = useServiceCatalogStore((s) => s.addService);
  const updateService = useServiceCatalogStore((s) => s.updateService);

  // Preenche o form ao editar
  useEffect(() => {
    if (open && service) {
      reset({
        name: service.name,
        description: service.description ?? "",
        price: service.price,
        category: service.category,
        isActive: service.isActive,
      });
      setValueDisplay(
        service.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
      );
    } else if (open && !service) {
      reset({ isActive: true });
      setValueDisplay("");
    }
  }, [open, service, reset]);

  function handleOpenChange(next: boolean) {
    if (!next) {
      reset({ isActive: true });
      setValueDisplay("");
    }
    onOpenChange(next);
  }

  function handleValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const masked = maskCurrency(e.target.value);
    setValueDisplay(masked);
    setValue("price", parseCurrency(masked), { shouldValidate: true });
  }

  async function onSubmit(data: ServiceCatalogInput) {
    await new Promise((r) => setTimeout(r, 400));

    if (service) {
      updateService({ ...service, ...data });
      toast.success("Serviço atualizado!", { description: data.name });
    } else {
      addService({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date().toISOString(),
      });
      toast.success("Serviço cadastrado!", { description: data.name });
    }

    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">

          {/* Nome */}
          <FormField label="Nome do serviço" htmlFor="name" error={errors.name?.message}>
            <Input
              id="name"
              placeholder="Ex: Carro completo com parabrisa"
              {...register("name")}
            />
          </FormField>

          {/* Categoria */}
          <FormField label="Categoria" htmlFor="category" error={errors.category?.message}>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? ""} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automotive">Automotivo</SelectItem>
                    <SelectItem value="architecture">Arquitetura</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {/* Preço */}
          <FormField label="Valor padrão (R$)" htmlFor="price" error={errors.price?.message}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                R$
              </span>
              <Input
                id="price"
                inputMode="numeric"
                placeholder="0,00"
                className="pl-9"
                value={valueDisplay}
                onChange={handleValueChange}
              />
            </div>
          </FormField>

          {/* Descrição */}
          <FormField label="Descrição" htmlFor="description">
            <Textarea
              id="description"
              placeholder="Descreva o que inclui este serviço..."
              rows={2}
              {...register("description")}
            />
          </FormField>

          {/* Ativo */}
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Label htmlFor="isActive" className="flex-1 text-sm cursor-pointer select-none">
              Serviço ativo (aparece nas seleções)
            </Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {service ? "Salvar Alterações" : "Cadastrar Serviço"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
