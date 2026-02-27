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
import { Employee } from "@/types";
import { useEmployeesStore } from "@/store/employees-store";

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: Employee | null;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const isEditing = !!employee;
  const { addEmployee, updateEmployee } = useEmployeesStore();

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
      role: "EMPLOYEE",
      isActive: true,
      specialties: [],
    },
  });

  useEffect(() => {
    if (employee) {
      reset({
        name: employee.name,
        email: employee.email,
        phone: employee.phone ?? "",
        role: (employee.userRole === "COMPANY_ADMIN" ? "COMPANY_ADMIN" : "EMPLOYEE") as "COMPANY_ADMIN" | "EMPLOYEE",
        isActive: employee.active ?? true,
        specialties: employee.specialties ?? [],
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        role: "EMPLOYEE",
        isActive: true,
        specialties: [],
      });
    }
  }, [employee, reset, open]);

  const onSubmit = async (data: EmployeeFormData) => {
    const now = new Date().toISOString();
    if (employee) {
      updateEmployee({
        ...employee,
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        userRole: data.role,
        active: data.isActive,
        specialties: data.specialties,
      });
    } else {
      addEmployee({
        id: `emp-${Date.now()}`,
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        role: data.role === "COMPANY_ADMIN" ? "Administrador" : "Técnico",
        userRole: data.role,
        active: data.isActive,
        specialties: data.specialties,
        hireDate: now.slice(0, 10),
        servicesCompleted: 0,
        revenueGenerated: 0,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Membro" : "Novo Membro da Equipe"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Nome Completo" error={errors.name?.message} required>
            <Input placeholder="João Silva" {...register("name")} />
          </FormField>

          <FormField label="E-mail" error={errors.email?.message} required>
            <Input
              type="email"
              placeholder="joao@empresa.com"
              {...register("email")}
            />
          </FormField>

          <FormField label="Telefone" error={errors.phone?.message}>
            <Input placeholder="(11) 99999-9999" {...register("phone")} />
          </FormField>

          <FormField label="Função" error={errors.role?.message} required>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Técnico</SelectItem>
                    <SelectItem value="COMPANY_ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="text-sm font-medium">Membro Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Membros inativos não aparecem nos agendamentos
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
                : "Adicionar Membro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
