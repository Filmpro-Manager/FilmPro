"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { employeeSchema, EmployeeFormData } from "@/lib/validators";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Employee } from "@/types";
import { useEmployeesStore } from "@/store/employees-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateUser, apiUpdateUser } from "@/lib/api";
import { maskPhone } from "@/lib/masks";
import { toast } from "sonner";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

function mapApiUserToEmployee(u: {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  createdAt: string;
}): Employee {
  const roleUpper = u.role.toUpperCase() as Employee["userRole"];
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? "",
    role:
      u.role === "owner" || u.role === "manager"
        ? "Administrador"
        : "Técnico",
    userRole: roleUpper,
    active: u.status === "active",
    hireDate: u.createdAt.slice(0, 10),
    servicesCompleted: 0,
    revenueGenerated: 0,
    specialties: [],
  };
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const isEditing = !!employee;
  const { addEmployee, updateEmployee } = useEmployeesStore();
  const { token } = useAuthStore();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "employee",
      specialties: [],
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        email: employee.email,
        phone: employee.phone ?? "",
        role:
          employee.userRole === "MANAGER" || (employee.userRole as string) === "manager"
            ? "manager"
            : "employee",
        specialties: employee.specialties ?? [],
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        role: "employee",
        specialties: [],
      });
    }
  }, [employee, reset, open]);

  const onSubmit = async (data: EmployeeFormData) => {
    if (!token) {
      toast.error("Sessão expirada. Faça login novamente.");
      return;
    }

    try {
      if (isEditing && employee) {
        // Atualiza dados básicos
        const updated = await apiUpdateUser(
          employee.id,
          { name: data.name, phone: data.phone ?? "", role: data.role },
          token,
        );

        updateEmployee(mapApiUserToEmployee(updated));
        toast.success("Usuário atualizado com sucesso!");
      } else {
        const created = await apiCreateUser(
          {
            name: data.name,
            email: data.email,
            phone: data.phone ?? "",
            role: data.role,
          },
          token,
        );
        addEmployee(mapApiUserToEmployee(created));
        toast.success("Usuário criado! As credenciais foram enviadas para o e-mail cadastrado.");
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
          <DialogTitle>
            {isEditing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
          {!isEditing && (
            <p className="text-xs text-muted-foreground mt-1">
              Uma senha temporária será gerada automaticamente e enviada para o e-mail cadastrado.
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome Completo" error={errors.name?.message} required>
            <Input placeholder="João Silva" {...register("name")} />
          </FormField>

          <FormField label="E-mail" error={errors.email?.message} required>
            <Input
              type="email"
              placeholder="joao@empresa.com"
              disabled={isEditing}
              {...register("email")}
            />
          </FormField>

          <FormField label="Telefone" error={errors.phone?.message}>
            <Input
              placeholder="(11) 99999-9999"
              {...register("phone")}
              onChange={(e) => {
                e.target.value = maskPhone(e.target.value);
                register("phone").onChange(e);
              }}
            />
          </FormField>

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
                    <SelectItem value="employee">Técnico (Usuário)</SelectItem>
                    <SelectItem value="manager">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

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

