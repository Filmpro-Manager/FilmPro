"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Power, PowerOff, Car, Home, Building2, Trash2 } from "lucide-react";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import type { ServiceCatalog, ServiceCategory } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceFormDialog } from "@/components/servicos/service-form-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

const CATEGORY_LABEL: Record<ServiceCategory | "all", string> = {
  all:          "Todos",
  automotive:   "Automotivo",
  residential:  "Residencial",
  commercial:   "Comercial",
};

const CATEGORY_ICON: Record<ServiceCategory, React.ElementType> = {
  automotive:  Car,
  residential: Home,
  commercial:  Building2,
};

const CATEGORY_COLOR: Record<ServiceCategory, string> = {
  automotive:  "bg-blue-500/10 text-blue-500",
  residential: "bg-emerald-500/10 text-emerald-500",
  commercial:  "bg-violet-500/10 text-violet-500",
};

type CategoryFilter = ServiceCategory | "all";

export default function ServicosPage() {
  const { services, toggleActive, deleteItem } = useServiceCatalogStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CategoryFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter((s) => {
      const matchCat  = tab === "all" || s.category === tab;
      const matchText = !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [services, search, tab]);

  // contagens por categoria
  const counts = useMemo(() => ({
    all:         services.length,
    automotive:  services.filter((s) => s.category === "automotive").length,
    residential: services.filter((s) => s.category === "residential").length,
    commercial:  services.filter((s) => s.category === "commercial").length,
  }), [services]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(s: ServiceCatalog) {
    setEditing(s);
    setFormOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Serviços"
        description="Gerencie os serviços oferecidos e seus valores padrão"
      >
        <Button onClick={openNew} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Serviço
        </Button>
      </PageHeader>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou descrição..."
          className="flex-1"
        />

        <div className="flex gap-1 flex-wrap">
          {(["all", "automotive", "residential", "commercial"] as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setTab(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {CATEGORY_LABEL[cat]}
              <span className="ml-1.5 opacity-60">{counts[cat]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serviço</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Categoria</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Descrição</th>
              <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor Padrão</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum serviço encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const Icon = CATEGORY_ICON[s.category];
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${!s.isActive ? "opacity-50" : ""}`}
                  >
                    {/* Nome */}
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
                      {/* Categoria mobile */}
                      <p className="text-xs text-muted-foreground sm:hidden mt-0.5">
                        {CATEGORY_LABEL[s.category]}
                      </p>
                    </td>

                    {/* Categoria */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLOR[s.category]}`}>
                        <Icon className="w-3 h-3" />
                        {CATEGORY_LABEL[s.category]}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-muted-foreground text-xs line-clamp-1">
                        {s.description ?? "—"}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">
                      {s.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <Badge variant={s.isActive ? "default" : "secondary"} className="text-[10px]">
                        {s.isActive ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <span className="sr-only">Ações</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <circle cx="10" cy="4"  r="1.5" />
                              <circle cx="10" cy="10" r="1.5" />
                              <circle cx="10" cy="16" r="1.5" />
                            </svg>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(s)}>
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(s.id)}>
                            {s.isActive
                              ? <><PowerOff className="w-3.5 h-3.5 mr-2" />Desativar</>
                              : <><Power className="w-3.5 h-3.5 mr-2" />Ativar</>
                            }
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                            className="text-sm cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Excluir serviço
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé com total */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} serviço{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}
          {" · "}
          Valor médio:{" "}
          {(filtered.reduce((acc, s) => acc + s.price, 0) / filtered.length).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
      )}

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="serviço"
        onConfirm={() => { if (deleteTarget) deleteItem(deleteTarget.id); }}
      />
    </div>
  );
}
