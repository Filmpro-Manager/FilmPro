"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Phone, Car, Trash2, Upload, Download, Square, CheckSquare } from "lucide-react";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientFormDialog } from "@/components/clientes/client-form-dialog";
import { ClientDetailDialog } from "@/components/clientes/client-detail-dialog";
import { ClientCsvImportDialog } from "@/components/clientes/client-csv-import-dialog";
import { useClientsStore } from "@/store/clients-store";
import { useAuthStore } from "@/store/auth-store";
import { apiGetClients, apiDeleteClient, type ApiClient } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { Client } from "@/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { toast } from "sonner";

function mapApiClient(api: ApiClient): Client {
  const firstVehicle = api.vehicles[0];
  return {
    id: api.id,
    name: api.name,
    phone: api.phone ?? "",
    email: api.email ?? undefined,
    document: api.document ?? undefined,
    notes: api.notes ?? undefined,
    vehicles: api.vehicles.map((v) => ({
      id: v.id,
      brand: v.brand,
      model: v.model,
      year: v.year ?? undefined,
      plate: v.plate ?? "",
      color: v.color ?? undefined,
    })),
    vehicle: firstVehicle
      ? { id: firstVehicle.id, brand: firstVehicle.brand, model: firstVehicle.model, year: firstVehicle.year ?? undefined, plate: firstVehicle.plate ?? "", color: firstVehicle.color ?? undefined }
      : undefined,
    serviceHistory: [],
    totalSpent: 0,
    createdAt: api.createdAt,
  };
}

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm]             = useState(false);
  const [openImport, setOpenImport]         = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading]               = useState(true);
  const [selectMode, setSelectMode]         = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const clients           = useClientsStore((s) => s.clients);
  const setClients        = useClientsStore((s) => s.setClients);
  const deleteClientStore = useClientsStore((s) => s.deleteClient);
  const { token }         = useAuthStore();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  // Cancela o modo de seleção ao navegar para outra rota
  useEffect(() => {
    if (pathnameRef.current !== pathname) {
      exitSelectMode();
    }
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!token) return;
    apiGetClients(token)
      .then((data) => setClients(data.map(mapApiClient)))
      .catch(() => toast.error("Erro ao carregar clientes"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleDelete(id: string) {
    if (!token) return;
    try {
      await apiDeleteClient(id, token);
      deleteClientStore(id);
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
    } catch {
      toast.error("Erro ao excluir cliente");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.document?.includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.vehicle?.plate?.toLowerCase().includes(q) ?? false) ||
        (c.vehicle?.model?.toLowerCase().includes(q) ?? false)
    );
  }, [search, clients]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));

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
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  }

  function exportCSV() {
    const sep = ";";
    const toExport = clients.filter((c) => selectedIds.has(c.id));
    const header = [
      "nome","telefone","documento","tipo_documento","email","data_nascimento",
      "veiculo_marca","veiculo_modelo","veiculo_placa","veiculo_cor","veiculo_ano","observacoes",
    ].join(sep);

    const rows = toExport.map((c) => {
      const v = c.vehicle;
      return [
        c.name,
        c.phone ?? "",
        c.document ?? "",
        c.documentType ?? "",
        c.email ?? "",
        c.birthDate ?? "",
        v?.brand ?? "",
        v?.model ?? "",
        v?.plate ?? "",
        v?.color ?? "",
        v?.year ? String(v.year) : "",
        c.notes ?? "",
      ].map((val) => `"${String(val).replace(/"/g, '""')}"`).join(sep);
    });

    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(
      `${toExport.length} ${toExport.length === 1 ? "cliente exportado" : "clientes exportados"}`
    );
    exitSelectMode();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Carregando clientes...
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Clientes" description="Gerencie os clientes da empresa">
        <Button size="sm" variant="outline" disabled={selectMode} onClick={() => setOpenImport(true)}>
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
        <Button size="sm" variant="outline" onClick={enterSelectMode} disabled={selectMode}>
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
        <Button size="sm" disabled={selectMode} onClick={() => setOpenForm(true)}>
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </PageHeader>

      <div className="flex items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome, documento, placa..."
          className="max-w-sm"
        />

        {selectMode && (
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {allFilteredSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />
            }
            {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        )}

        <span className="text-xs text-muted-foreground ml-auto shrink-0">
          {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
          </div>
        ) : (
          filtered.map((client) => (
            <div key={client.id} className="relative">
              {/* Checkbox — visível só em modo de seleção */}
              {selectMode && (
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-8 h-8 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSelect(client.id); }}
                >
                  {selectedIds.has(client.id)
                    ? <CheckSquare className="w-4 h-4 text-primary" />
                    : <Square className="w-4 h-4 text-muted-foreground" />
                  }
                </div>
              )}

              <button
                onClick={() => selectMode ? toggleSelect(client.id) : setSelectedClient(client)}
                className={cn(
                  "w-full text-left flex items-center gap-4 p-4 pr-12 rounded-xl border transition-colors group",
                  selectMode && "pl-12",
                  selectedIds.has(client.id)
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:bg-accent/30"
                )}
              >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                {client.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground">{client.name}</p>
                  {client.documentType && (
                    <Badge variant="outline" className="text-[10px] px-1.5 h-4">
                      {client.documentType.toUpperCase()}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {client.phone}
                  </span>
                  {client.vehicle && (
                    <span className="flex items-center gap-1">
                      <Car className="h-3 w-3" />
                      {client.vehicle.brand} {client.vehicle.model} — {client.vehicle.plate}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right shrink-0 space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(client.totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {client.serviceHistory.length}{" "}
                  {client.serviceHistory.length === 1 ? "serviço" : "serviços"}
                </p>
              </div>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="sr-only">Ações</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5" />
                      <circle cx="10" cy="10" r="1.5" />
                      <circle cx="10" cy="16" r="1.5" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedClient(client)}>
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget({ id: client.id, name: client.name })}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Excluir cliente
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          ))
        )}
      </div>

      <ClientCsvImportDialog open={openImport} onOpenChange={setOpenImport} />
      <ClientFormDialog open={openForm} onOpenChange={setOpenForm} />
      <ClientDetailDialog
        client={selectedClient}
        open={!!selectedClient}
        onOpenChange={(open: boolean) => !open && setSelectedClient(null)}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="cliente"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget.id); }}
      />

      {/* ── Barra de seleção (aparece apenas em modo exportação) ── */}
      {selectMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border border-border bg-card shadow-xl shadow-black/20 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedIds.size === 0
              ? "Selecione os clientes"
              : `${selectedIds.size} ${selectedIds.size === 1 ? "cliente selecionado" : "clientes selecionados"}`
            }
          </span>
          <Button
            size="sm"
            onClick={exportCSV}
            disabled={selectedIds.size === 0}
          >
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
