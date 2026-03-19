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
import { ShieldCheck, Pencil } from "lucide-react";
import { useUsersStore } from "@/store/users-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateUser, apiUpdateUser } from "@/lib/api";
import { toast } from "sonner";
import type { User } from "@/types";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: User | null;
}

export function UserFormDialog({
  open,
  onOpenChange,
  editing,
}: UserFormDialogProps) {
  const { addUser, updateUser } = useUsersStore();
  const { token } = useAuthStore();
  const isEditing = !!editing;

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
      phone: "",
      role: "EMPLOYEE",
      isActive: true,
      companyId: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        reset({
          name: editing.name,
          email: editing.email,
          phone: "",
          role: editing.role as "OWNER" | "MANAGER" | "EMPLOYEE",
          isActive: editing.active,
          companyId: editing.companyId ?? "",
        });
      } else {
        reset({
          name: "",
          email: "",
          phone: "",
          role: "EMPLOYEE",
          isActive: true,
          companyId: "",
        });
      }
    }
  }, [open, editing, reset]);

  const onSubmit = async (data: UserFormData) => {
    if (!token) return;
    try {
      if (isEditing && editing) {
        const updated = await apiUpdateUser(
          editing.id,
          {
            name: data.name,
            role: data.role.toLowerCase() as "manager" | "employee",
          },
          token
        );
        updateUser({
          ...editing,
          name: updated.name,
          role: updated.role.toUpperCase(),
        });
        toast.success("Usuário atualizado com sucesso");
      } else {
        const created = await apiCreateUser(
          {
            name: data.name,
            email: data.email,
            phone: data.phone ?? "",
            role: data.role.toLowerCase() as "manager" | "employee",
          },
          token
        );
        addUser({
          id: created.id,
          name: created.name,
          email: created.email,
          role: created.role.toUpperCase(),
          active: created.status === "active",
          createdAt: created.createdAt,
        });
        toast.success("Usuário criado. Senha enviada por e-mail.");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar usuário");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Pencil className="w-4 h-4 text-primary" />
                Editar Usuário
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4 text-primary" />
                Novo Usuário
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Altere os dados do usuário abaixo."
              : "Preencha os dados para criar um novo usuário no sistema."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome Completo" error={errors.name?.message} required>
            <Input placeholder="Nome do usuário" {...register("name")} />
          </FormField>

          <FormField label="E-mail" error={errors.email?.message} required>
            <Input
              type="email"
              placeholder="usuario@empresa.com"
              disabled={isEditing}
              className={isEditing ? "opacity-60 cursor-not-allowed" : ""}
              {...register("email")}
            />
          </FormField>

          {!isEditing && (
            <FormField label="Telefone" error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                {...register("phone")}
              />
            </FormField>
          )}

          <FormField label="Perfil de Acesso" error={errors.role?.message} required>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isEditing && editing?.role === "OWNER"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    {(!isEditing || editing?.role === "OWNER") && (
                      <SelectItem value="OWNER">Proprietário</SelectItem>
                    )}
                    <SelectItem value="MANAGER">Administrador</SelectItem>
                    <SelectItem value="EMPLOYEE">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {!isEditing && (
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
          )}

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
