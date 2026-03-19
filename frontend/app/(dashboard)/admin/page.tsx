"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User } from "@/types";
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock,
  Users,
  Crown,
  AlertTriangle,
  Trash2,
  Pencil,
} from "lucide-react";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import { useUsersStore } from "@/store/users-store";
import { apiDeleteUser, apiSetUserActive } from "@/lib/api";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

const roleLabel: Record<User["role"], string> = {
  OWNER: "Administrador",
  MANAGER: "Administrador",
  EMPLOYEE: "Técnico",
};

const roleIcon: Record<User["role"], React.ReactNode> = {
  OWNER: <Crown className="w-3 h-3" />,
  MANAGER: <ShieldCheck className="w-3 h-3" />,
  EMPLOYEE: <Users className="w-3 h-3" />,
};

const roleVariant: Record<User["role"], "default" | "blue" | "secondary"> = {
  OWNER: "default",
  MANAGER: "blue",
  EMPLOYEE: "secondary",
};

export default function AdminPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const users = useUsersStore((s) => s.users);
  const deleteUser = useUsersStore((s) => s.deleteUser);
  const updateUser = useUsersStore((s) => s.updateUser);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const { token } = useAuthStore();

  // Role guard — redirect non-owners
  useEffect(() => {
    if (user && user.role !== "OWNER") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!user || user.role !== "OWNER") {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4 text-muted-foreground">
        <AlertTriangle className="w-10 h-10 text-destructive" />
        <p className="text-sm">Acesso restrito ao Administrador da empresa.</p>
      </div>
    );
  }

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());

    const matchTab =
      activeTab === "all" ||
      (activeTab === "owner" && u.role === "OWNER") ||
      (activeTab === "manager" && u.role === "MANAGER") ||
      (activeTab === "employee" && u.role === "EMPLOYEE");

    return matchSearch && matchTab;
  });

  const counts = {
    all: users.length,
    owner: users.filter((u) => u.role === "OWNER").length,
    manager: users.filter((u) => u.role === "MANAGER").length,
    employee: users.filter((u) => u.role === "EMPLOYEE").length,
    active: users.filter((u) => u.active).length,
  };

  const handleNew = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (u: User) => {
    setEditTarget(u);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel Administrativo"
        description="Gerenciamento de usuários e permissões do sistema"
      >
        <div className="flex items-center gap-2">
          <Badge className="gap-1.5 text-xs">
            <ShieldCheck className="w-3 h-3" />
            Administrador
          </Badge>
          <Button size="sm" className="gap-2" onClick={handleNew}>
            <UserPlus className="w-4 h-4" />
            Novo Usuário
          </Button>
        </div>
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Total
            </p>
            <p className="text-2xl font-bold mt-1">{counts.all}</p>
            <p className="text-xs text-muted-foreground">
              {counts.active} ativos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Crown className="w-3 h-3" /> Administradores
            </p>
            <p className="text-2xl font-bold mt-1">{counts.owner}</p>
            <p className="text-xs text-muted-foreground">acesso total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Equipe Admin
            </p>
            <p className="text-2xl font-bold mt-1">{counts.manager}</p>
            <p className="text-xs text-muted-foreground">gerem a loja</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" /> Técnicos
            </p>
            <p className="text-2xl font-bold mt-1">{counts.employee}</p>
            <p className="text-xs text-muted-foreground">acesso operacional</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <SearchInput
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(value) => setSearch(value)}
              className="max-w-sm"
            />
            <span className="text-sm text-muted-foreground shrink-0">
              {filtered.length} usuário(s)
            </span>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="owner">Proprietários ({counts.owner})</TabsTrigger>
              <TabsTrigger value="manager">Admin ({counts.manager})</TabsTrigger>
              <TabsTrigger value="employee">
                Técnicos ({counts.employee})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Usuário
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                        E-mail
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">
                        Perfil
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                        Empresa
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-center">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u, idx) => (
                      <tr
                        key={u.id}
                        className={`border-t transition-colors hover:bg-muted/30 ${
                          idx % 2 === 0 ? "" : "bg-muted/10"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={roleVariant[u.role]}
                            className="gap-1 text-xs"
                          >
                            {roleIcon[u.role]}
                            {roleLabel[u.role]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-sm">
                          {u.companyId ?? u.employeeId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge
                            variant={u.active ? "success" : "secondary"}
                            className="text-xs"
                          >
                            {u.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Editar usuário"
                              onClick={() => handleEdit(u)}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={u.active ? "Desativar usuário" : "Ativar usuário"}
                              onClick={async () => {
                                if (!token) return;
                                await apiSetUserActive(u.id, !u.active, token).catch(() => {});
                                updateUser({ ...u, active: !u.active });
                              }}
                            >
                              {u.active ? (
                                <Lock className="w-3.5 h-3.5 text-yellow-600" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir usuário"
                              onClick={() => setDeleteTarget({ id: u.id, name: u.name })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditTarget(null);
        }}
        editing={editTarget}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="usuário"
        onConfirm={async () => {
          if (deleteTarget && token) {
            await apiDeleteUser(deleteTarget.id, token).catch(() => {});
            deleteUser(deleteTarget.id);
          }
        }}
      />
    </div>
  );
}
