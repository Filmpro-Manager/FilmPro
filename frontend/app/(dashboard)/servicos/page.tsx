"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Pencil, Power, PowerOff, Car, Landmark, Wrench, Trash2, Download, Upload, Square, CheckSquare } from "lucide-react";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useAuthStore } from "@/store/auth-store";
import type { ServiceCatalog, ServiceCategory } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ServiceFormDialog } from "@/components/servicos/service-form-dialog";
import { ServiceCsvImportDialog } from "@/components/servicos/service-csv-import-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { apiToggleService, apiDeleteService } from "@/lib/api";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

const CATEGORY_LABEL: Record<ServiceCategory | "all", string> = {
  all:          "Todos",
  automotive:   "Automotivo",
  architecture: "Arquitetura",
  general:      "Geral",
};

const CATEGORY_ICON: Record<ServiceCategory, React.ElementType> = {
  automotive:   Car,
  architecture: Landmark,
  general:      Wrench,
};

const CATEGORY_COLOR: Record<ServiceCategory, string> = {
  automotive:   "bg-blue-500/10 text-blue-500",
  architecture: "bg-violet-500/10 text-violet-500",
  general:      "bg-zinc-500/10 text-zinc-500",
};

type CategoryFilter = ServiceCategory | "all";

export default function ServicosPage() {
  const { services, updateService, deleteItem } = useServiceCatalogStore();
  const { token } = useAuthStore();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<CategoryFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalog | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [openImport, setOpenImport] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    if (pathnameRef.current !== pathname) exitSelectMode();
    pathnameRef.current = pathname;
  }, [pathname]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter((s) => {
      const matchCat  = tab === "all" || s.category === tab;
      const matchText = !q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q);
      return matchCat && matchText;
    });
  }, [services, search, tab]);

  const counts = useMemo(() => ({
    all:          services.length,
    automotive:   services.filter((s) => s.category === "automotive").length,
    architecture: services.filter((s) => s.category === "architecture").length,
    general:      services.filter((s) => s.category === "general").length,
  }), [services]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id));

  function enterSelectMode() {
    setSelectMode(true);
    setSelectedIds(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)));
    }
  }

  function exportCSV() {
    const toExport = services.filter((s) => selectedIds.has(s.id));
    const sep = ";";
    const header = ["nome", "categoria", "valor", "descricao", "ativo"].join(sep);
    const rows = toExport.map((s) =>
      [
        s.name,
        CATEGORY_LABEL[s.category],
        s.price.toFixed(2).replace(".", ","),
        s.description ?? "",
        s.isActive ? "Sim" : "Não",
      ]
        .map((val) => `"${String(val).replace(/"/g, '""')}"`)
        .join(sep)
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servicos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      `${toExport.length} ${toExport.length === 1 ? "serviço exportado" : "serviços exportados"}`
    );
    exitSelectMode();
  }

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(s: ServiceCatalog) {
    setEditing(s);
    setFormOpen(true);
  }

  async function handleToggleActive(s: ServiceCatalog) {
    if (!token) return;
    try {
      const updated = await apiToggleService(s.id, token);
      updateService({ ...s, isActive: updated.isActive });
    } catch {
      toast.error("Erro ao alterar status do serviço");
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !token) return;
    try {
      await apiDeleteService(deleteTarget.id, token);
      deleteItem(deleteTarget.id);
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    } catch {
      toast.error("Erro ao excluir serviço");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Serviços"
        description="Gerencie os serviços oferecidos e seus valores padrão"
      >
        <Button size="sm" variant="outline" disabled={selectMode} onClick={() => setOpenImport(true)}>
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
        <Button size="sm" variant="outline" onClick={enterSelectMode} disabled={selectMode}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button onClick={openNew} size="sm" disabled={selectMode}>
          <Plus className="w-4 h-4" />
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

        <div className="flex gap-1 flex-wrap items-center">
          {selectMode && (
            <button
              type="button"
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mr-2"
            >
              {allFilteredSelected
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4" />
              }
              {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          )}

          {(["all", "automotive", "architecture", "general"] as CategoryFilter[]).map((cat) => (
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
              {selectMode && <th className="px-4 py-3 w-8" />}
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
                <td colSpan={selectMode ? 8 : 7} className="text-center py-10 text-muted-foreground text-sm">
                  Nenhum serviço encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const Icon = CATEGORY_ICON[s.category];
                const isSelected = selectedIds.has(s.id);
                return (
                  <tr
                    key={s.id}
                    onClick={() => selectMode && toggleSelect(s.id)}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-muted/30 ${selectMode ? "cursor-pointer" : ""} ${!s.isActive ? "opacity-60" : ""} ${isSelected ? "bg-primary/5 border-primary/20" : ""}`}
                  >
                    {/* Checkbox — visivel apenas em selectMode */}
                    {selectMode && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div
                          className="flex items-center justify-center w-6 h-6 cursor-pointer"
                          onClick={() => toggleSelect(s.id)}
                        >
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-primary" />
                            : <Square className="w-4 h-4 text-muted-foreground" />
                          }
                        </div>
                      </td>
                    )}

                    {/* Nome */}
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.name}</p>
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
                      {!selectMode && (
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
                            <DropdownMenuItem onClick={() => handleToggleActive(s)}>
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
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      {filtered.length > 0 && !selectMode && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{filtered.length} serviço{filtered.length !== 1 ? "s" : ""} exibido{filtered.length !== 1 ? "s" : ""}</span>
          <span>
            Valor medio:{" "}
            {(filtered.reduce((acc, s) => acc + s.price, 0) / filtered.length).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </span>
        </div>
      )}

      <ServiceCsvImportDialog open={openImport} onOpenChange={setOpenImport} />
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
        onConfirm={handleDelete}
      />

      {/* Barra de seleção (aparece apenas em modo exportação) */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border border-border bg-card shadow-xl shadow-black/20 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedIds.size === 0
              ? "Selecione os serviços"
              : `${selectedIds.size} ${selectedIds.size === 1 ? "serviço selecionado" : "serviços selecionados"}`
            }
          </span>
          <Button size="sm" onClick={exportCSV} disabled={selectedIds.size === 0}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button size="sm" variant="outline" onClick={exitSelectMode}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}