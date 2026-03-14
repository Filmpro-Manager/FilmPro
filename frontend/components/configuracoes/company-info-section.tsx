"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validators";
import { maskCNPJ, maskPhone, maskCEP } from "@/lib/masks";
import { useCompanyStore } from "@/store/company-store";
import { useAuthStore } from "@/store/auth-store";
import { apiUpdateStore } from "@/lib/api";
import { FormField } from "@/components/shared/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function CompanyInfoSection() {
  const { settings, update } = useCompanyStore();
  const { user, token } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: settings,
  });

  // Sincroniza o form sempre que o store for hidratado pela API
  useEffect(() => {
    reset(settings);
  }, [settings.name, settings.tradeName, settings.cnpj]);

  function handleOpen() {
    reset(settings);
    setOpen(true);
  }

  async function handleCepChange(value: string, fieldOnChange: (v: string) => void) {
    const masked = maskCEP(value);
    fieldOnChange(masked);
    if (masked.length !== 9) return;
    setFetchingCep(true);
    try {
      const digits = masked.replace(/\D/g, "");
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error("CEP não encontrado."); return; }
      if (data.logradouro) setValue("address.street", data.logradouro, { shouldDirty: true });
      if (data.bairro)     setValue("address.neighborhood", data.bairro, { shouldDirty: true });
      if (data.localidade) setValue("address.city", data.localidade, { shouldDirty: true });
      if (data.uf)         setValue("address.state", data.uf, { shouldDirty: true });
    } catch {
      toast.error("Erro ao consultar o CEP.");
    } finally {
      setFetchingCep(false);
    }
  }

  async function onSubmit(data: CompanySettingsInput) {
    if (user?.storeId && token) {
      try {
        await apiUpdateStore(user.storeId, {
          razaoSocial: data.name,
          name: data.name,
          nomeFantasia: data.tradeName,
          cnpj: data.cnpj,
          phone: data.phone,
          email: data.email,
          addressStreet: data.address.street,
          addressNumber: data.address.number,
          addressComplement: data.address.complement ?? null,
          addressDistrict: data.address.neighborhood,
          addressZipcode: data.address.zipCode,
          addressCity: data.address.city,
          addressState: data.address.state,
        }, token);
      } catch {
        toast.error("Erro ao salvar no servidor. Verifique a conexão.");
        return;
      }
    }
    update(data);
    toast.success("Informações da empresa salvas.");
    setOpen(false);
  }

  const addr = settings.address;
  const fullAddress = addr?.street
    ? `${addr.street}, ${addr.number}${addr.complement ? ` — ${addr.complement}` : ""}`
    : undefined;
  const cityState = addr?.city ? `${addr.city} / ${addr.state}` : undefined;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Dados da Empresa</CardTitle>
          <Button variant="outline" size="sm" onClick={handleOpen} className="gap-2">
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <InfoRow label="Razão Social" value={settings.name} />
          <InfoRow label="Nome Fantasia" value={settings.tradeName} />
          <InfoRow label="CNPJ" value={settings.cnpj} />
          <InfoRow label="Telefone" value={settings.phone} />
          <InfoRow label="E-mail" value={settings.email} />
          <div />
          <InfoRow label="Endereço" value={fullAddress} />
          <InfoRow label="Bairro" value={addr?.neighborhood} />
          <InfoRow label="CEP" value={addr?.zipCode} />
          <InfoRow label="Cidade / Estado" value={cityState} />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Dados da Empresa</DialogTitle>
          </DialogHeader>

          <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Razão Social" htmlFor="name" error={errors.name?.message} required>
                <Input id="name" {...register("name")} placeholder="Razão Social Ltda." />
              </FormField>
              <FormField label="Nome Fantasia" htmlFor="tradeName" error={errors.tradeName?.message} required>
                <Input id="tradeName" {...register("tradeName")} placeholder="Nome Fantasia" />
              </FormField>
              <FormField label="CNPJ" htmlFor="cnpj" error={errors.cnpj?.message} required>
                <Controller name="cnpj" control={control} render={({ field }) => (
                  <Input id="cnpj" inputMode="numeric" placeholder="00.000.000/0001-00"
                    value={field.value} onChange={(e) => field.onChange(maskCNPJ(e.target.value))} />
                )} />
              </FormField>
              <FormField label="Telefone" htmlFor="phone" error={errors.phone?.message} required>
                <Controller name="phone" control={control} render={({ field }) => (
                  <Input id="phone" inputMode="numeric" placeholder="(11) 99999-0000"
                    value={field.value} onChange={(e) => field.onChange(maskPhone(e.target.value))} />
                )} />
              </FormField>
              <FormField label="E-mail" htmlFor="email" error={errors.email?.message} required className="sm:col-span-2">
                <Input id="email" type="email" {...register("email")} placeholder="contato@empresa.com" />
              </FormField>
            </div>

            <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Rua" htmlFor="street" error={errors.address?.street?.message} required className="sm:col-span-2">
                <Input id="street" {...register("address.street")} placeholder="Rua das Películas" />
              </FormField>
              <FormField label="Número" htmlFor="number" error={errors.address?.number?.message} required>
                <Input id="number" {...register("address.number")} placeholder="472" />
              </FormField>
              <FormField label="Complemento" htmlFor="complement">
                <Input id="complement" {...register("address.complement")} placeholder="Sala 2" />
              </FormField>
              <FormField label="Bairro" htmlFor="neighborhood" error={errors.address?.neighborhood?.message} required>
                <Input id="neighborhood" {...register("address.neighborhood")} placeholder="Centro" />
              </FormField>
              <FormField label="CEP" htmlFor="zipCode" error={errors.address?.zipCode?.message} required>
                <Controller name="address.zipCode" control={control} render={({ field }) => (
                  <div className="relative">
                    <Input id="zipCode" inputMode="numeric" placeholder="00000-000"
                      value={field.value} onChange={(e) => handleCepChange(e.target.value, field.onChange)}
                      className={fetchingCep ? "pr-9" : ""} />
                    {fetchingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                )} />
              </FormField>
              <FormField label="Cidade" htmlFor="city" error={errors.address?.city?.message} required className="sm:col-span-2">
                <Input id="city" {...register("address.city")} placeholder="São Paulo" />
              </FormField>
              <FormField label="Estado" htmlFor="state" error={errors.address?.state?.message} required>
                <Controller name="address.state" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="state"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {BR_STATES.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" form="company-form" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}


