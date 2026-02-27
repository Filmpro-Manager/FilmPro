"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userSchema, UserFormData } from "@/lib/validators";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/shared/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { User } from "@/types";
import { ShieldCheck } from "lucide-react";
import { useUsersStore } from "@/store/users-store";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData?: User | null;
}

export function UserFormDialog({
  open,
  onOpenChange,
  userData,
}: UserFormDialogProps) {
  const isEditing = !!userData;
  const { addUser, updateUser } = useUsersStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: "",
      email: "",
      role: "EMPLOYEE",
      isActive: true,
      companyId: "",
    },
  });

  useEffect(() => {
    if (userData) {
      reset({
        name: userData.name,
        email: userData.email,
        role: userData.role,
        isActive: userData.active ?? true,
        companyId: userData.companyId ?? userData.employeeId ?? "",
      });
    } else {
      reset({
        name: "",
        email: "",
        role: "EMPLOYEE",
        isActive: true,
        companyId: "",
      });
    }
  }, [userData, reset, open]);

  const onSubmit = async (data: UserFormData) => {
    const now = new Date().toISOString();
    if (userData) {
      updateUser({
        ...userData,
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.isActive,
        companyId: data.companyId || undefined,
      });
    } else {
      addUser({
        id: `usr-${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        active: data.isActive,
        companyId: data.companyId || undefined,
        createdAt: now,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifique os dados e permissões do usuário."
              : "Preencha os dados para criar um novo usuário no sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome Completo" error={errors.name?.message} required>
            <Input placeholder="Nome do usuário" {...register("name")} />
          </FormField>

          <FormField
            label="E-mail"
            error={errors.email?.message}
            required
          >
            <Input
              type="email"
              placeholder="usuario@empresa.com"
              {...register("email")}
            />
          </FormField>

          {!isEditing && (
            <FormField
              label="Senha Inicial"
              error={errors.password?.message}
              required
            >
              <Input
                type="password"
                placeholder="Mínimo 6 caracteres"
                {...register("password")}
              />
            </FormField>
          )}

          <FormField label="Perfil de Acesso" error={errors.role?.message} required>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                    <SelectItem value="COMPANY_ADMIN">Admin Empresa</SelectItem>
                    <SelectItem value="EMPLOYEE">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="ID da Empresa" error={errors.companyId?.message}>
            <Input
              placeholder="company_001 (opcional)"
              {...register("companyId")}
            />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Usuário Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Usuários inativos não conseguem fazer login
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Salvando..."
                : isEditing
                ? "Salvar Alterações"
                : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
