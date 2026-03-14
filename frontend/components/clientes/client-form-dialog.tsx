"use client";

import { useCallback, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, Car, ChevronDown, ChevronUp } from "lucide-react";
import { clientSchema, type ClientInput } from "@/lib/validators";
import { maskCEP, maskPhone, maskPlate, maskCPF, maskCNPJ } from "@/lib/masks";
import { useClientsStore } from "@/store/clients-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateClient, apiCreateVehicle, type ApiClient } from "@/lib/api";
import { BRAND_NAMES, getModelsByBrand } from "@/data/car-brands";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const COLORS = [
  "Branco", "Preto", "Prata", "Cinza", "Vermelho", "Azul", "Verde",
  "Amarelo", "Laranja", "Marrom", "Bege", "Vinho", "Dourado",
];

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientFormDialog({ open, onOpenChange }: ClientFormDialogProps) {
  const [showVehicle, setShowVehicle] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { documentType: "none" },
  });

  const addClient = useClientsStore((s) => s.addClient);
  const { token } = useAuthStore();
  const selectedBrand = watch("vehicleBrand") ?? "";
  const docType = watch("documentType");
  const models = getModelsByBrand(selectedBrand);

  function mapApiClient(api: ApiClient, docType?: string, docValue?: string) {
    const first = api.vehicles[0];
    return {
      id: api.id,
      name: api.name,
      phone: api.phone ?? "",
      email: api.email ?? undefined,
      document: api.document ?? undefined,
      documentType: docType && docType !== "none" ? docType as "cpf" | "cnpj" : undefined,
      notes: api.notes ?? undefined,
      vehicles: api.vehicles.map((v) => ({ id: v.id, brand: v.brand, model: v.model, year: v.year ?? undefined, plate: v.plate ?? "", color: v.color ?? undefined })),
      vehicle: first ? { id: first.id, brand: first.brand, model: first.model, year: first.year ?? undefined, plate: first.plate ?? "", color: first.color ?? undefined } : undefined,
      serviceHistory: [] as [],
      totalSpent: 0,
      createdAt: api.createdAt,
    };
  }

  // ── Fecha/reseta o form ao fechar o dialog ────────────────────────────────
  function handleOpenChange(open: boolean) {
    if (!open) {
      reset();
      setShowVehicle(false);
    }
    onOpenChange(open);
  }

  // ── CEP auto-fill via ViaCEP ──────────────────────────────────────────────
  const fetchCEP = useCallback(
    async (raw: string) => {
      const digits = raw.replace(/\D/g, "");
      if (digits.length !== 8) return;
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const json = await res.json();
        if (json.erro) return;
        setValue("addressStreet",       json.logradouro ?? "", { shouldValidate: true });
        setValue("addressNeighborhood", json.bairro     ?? "", { shouldValidate: true });
        setValue("addressCity",         json.localidade ?? "", { shouldValidate: true });
        setValue("addressState",        json.uf         ?? "", { shouldValidate: true });
      } catch { /* silencia erro de rede */ }
    },
    [setValue]
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  async function onSubmit(data: ClientInput) {
    if (!token) { toast.error("Sessão expirada"); return; }

    const hasVehicle = data.vehicleBrand || data.vehicleModel || data.vehiclePlate;

    try {
      const created = await apiCreateClient({
        name: data.name,
        phone: data.phone || undefined,
        document: data.documentType !== "none" ? data.document : undefined,
        notes: data.notes || undefined,
      }, token);

      if (hasVehicle) {
        const vehicle = await apiCreateVehicle(created.id, {
          brand: data.vehicleBrand ?? "",
          model: data.vehicleModel ?? "",
          plate: data.vehiclePlate ?? undefined,
          color: data.vehicleColor ?? undefined,
          year: data.vehicleYear ?? undefined,
        }, token);
        created.vehicles = [vehicle];
      }

      addClient(mapApiClient(created, data.documentType, data.document));
      toast.success("Cliente cadastrado!", { description: data.name });
      reset();
      setShowVehicle(false);
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao cadastrar cliente");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Cliente</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-2">

          {/* ── Dados principais ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Nome completo"
              htmlFor="name"
              error={errors.name?.message}
              className="sm:col-span-2"
            >
              <Input id="name" placeholder="Nome do cliente" {...register("name")} />
            </FormField>

            <FormField
              label="Telefone"
              htmlFor="phone"
              error={errors.phone?.message}
              className="sm:col-span-2"
            >
              <Input
                id="phone"
                inputMode="tel"
                placeholder="(11) 99999-0000"
                maxLength={15}
                {...register("phone", {
                  onChange: (e) => { e.target.value = maskPhone(e.target.value); },
                })}
              />
            </FormField>
          </div>

          {/* ── Documento ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Tipo de Documento"
              htmlFor="documentType"
              required
              error={errors.documentType?.message}
            >
              <Controller
                name="documentType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <SelectTrigger id="documentType">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem documento</SelectItem>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {docType === "cpf" && (
              <FormField label="CPF" htmlFor="document" error={errors.document?.message}>
                <Input
                  id="document"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  maxLength={14}
                  {...register("document", {
                    onChange: (e) => { e.target.value = maskCPF(e.target.value); },
                  })}
                />
              </FormField>
            )}

            {docType === "cnpj" && (
              <FormField label="CNPJ" htmlFor="document" error={errors.document?.message}>
                <Input
                  id="document"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  {...register("document", {
                    onChange: (e) => { e.target.value = maskCNPJ(e.target.value); },
                  })}
                />
              </FormField>
            )}
          </div>

          {/* ── Endereço ───────────────────────────────────────────────── */}
          <Separator />
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Endereço
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="CEP" htmlFor="addressZipCode">
              <Input
                id="addressZipCode"
                inputMode="numeric"
                placeholder="00000-000"
                maxLength={9}
                {...register("addressZipCode", {
                  onChange: (e) => {
                    const masked = maskCEP(e.target.value);
                    e.target.value = masked;
                    fetchCEP(masked);
                  },
                })}
              />
            </FormField>

            <FormField label="Estado (UF)" htmlFor="addressState" error={errors.addressState?.message}>
              <select
                id="addressState"
                {...register("addressState")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Selecione</option>
                {BR_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Rua / Logradouro" htmlFor="addressStreet" className="sm:col-span-2" error={errors.addressStreet?.message}>
              <Input id="addressStreet" placeholder="Rua das Flores" {...register("addressStreet")} />
            </FormField>

            <FormField label="Número" htmlFor="addressNumber">
              <Input id="addressNumber" placeholder="123" {...register("addressNumber")} />
            </FormField>

            <FormField label="Complemento" htmlFor="addressComplement">
              <Input id="addressComplement" placeholder="Apto 4, Sala 2..." {...register("addressComplement")} />
            </FormField>

            <FormField label="Bairro" htmlFor="addressNeighborhood" error={errors.addressNeighborhood?.message}>
              <Input id="addressNeighborhood" placeholder="Centro" {...register("addressNeighborhood")} />
            </FormField>

            <FormField label="Cidade" htmlFor="addressCity" error={errors.addressCity?.message}>
              <Input id="addressCity" placeholder="São Paulo" {...register("addressCity")} />
            </FormField>
          </div>

          {/* ── Veículo (colapsável) ────────────────────────────────────── */}
          <Separator />
          <button
            type="button"
            onClick={() => setShowVehicle((v) => !v)}
            className="flex w-full items-center gap-2 text-left group"
          >
            <Car className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
              Veículo
            </p>
            <span className="text-xs text-muted-foreground">(opcional)</span>
            {showVehicle
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
            }
          </button>

          {showVehicle && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Marca */}
              <FormField label="Marca" htmlFor="vehicleBrand">
                <Select
                  value={selectedBrand}
                  onValueChange={(v) => {
                    setValue("vehicleBrand", v, { shouldValidate: true });
                    setValue("vehicleModel", "", { shouldValidate: false });
                  }}
                >
                  <SelectTrigger id="vehicleBrand">
                    <SelectValue placeholder="Selecione a marca" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {BRAND_NAMES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Modelo */}
              <FormField label="Modelo" htmlFor="vehicleModel">
                <Select
                  value={watch("vehicleModel") ?? ""}
                  onValueChange={(v) => setValue("vehicleModel", v, { shouldValidate: true })}
                  disabled={!selectedBrand}
                >
                  <SelectTrigger id="vehicleModel">
                    <SelectValue placeholder={selectedBrand ? "Selecione o modelo" : "Selecione a marca primeiro"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              {/* Placa */}
              <FormField label="Placa" htmlFor="vehiclePlate">
                <Input
                  id="vehiclePlate"
                  placeholder="ABC-1D23"
                  maxLength={8}
                  className="uppercase"
                  {...register("vehiclePlate", {
                    onChange: (e) => { e.target.value = maskPlate(e.target.value); },
                  })}
                />
              </FormField>

              {/* Ano */}
              <FormField label="Ano" htmlFor="vehicleYear">
                <Input
                  id="vehicleYear"
                  inputMode="numeric"
                  placeholder={String(new Date().getFullYear())}
                  maxLength={4}
                  {...register("vehicleYear", { valueAsNumber: true })}
                />
              </FormField>

              {/* Cor */}
              <FormField label="Cor" htmlFor="vehicleColor" className="sm:col-span-2">
                <Select
                  value={watch("vehicleColor") ?? ""}
                  onValueChange={(v) => setValue("vehicleColor", v)}
                >
                  <SelectTrigger id="vehicleColor">
                    <SelectValue placeholder="Selecione a cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {COLORS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          )}

          {/* ── Observações ────────────────────────────────────────────── */}
          <Separator />
          <FormField label="Observações" htmlFor="notes">
            <Textarea
              id="notes"
              placeholder="Notas sobre o cliente..."
              {...register("notes")}
              rows={2}
            />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Cliente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
