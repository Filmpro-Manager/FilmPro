"use client";

import { useState, useMemo } from "react";
import { Plus, Phone, Car, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClientFormDialog } from "@/components/clientes/client-form-dialog";
import { ClientDetailDialog } from "@/components/clientes/client-detail-dialog";
import { ClientCsvImportDialog } from "@/components/clientes/client-csv-import-dialog";
import { useClientsStore } from "@/store/clients-store";
import { formatCurrency } from "@/lib/utils";
import type { Client } from "@/types";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";

export default function ClientesPage() {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm]         = useState(false);
  const [openImport, setOpenImport]     = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const clients     = useClientsStore((s) => s.clients);
  const deleteClient = useClientsStore((s) => s.deleteClient);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.document?.includes(q) ?? false) ||
        c.phone.includes(q) ||
        c.vehicle?.plate.toLowerCase().includes(q) ||
        c.vehicle?.model.toLowerCase().includes(q)
    );
  }, [search, clients]);

  return (
    <div className="space-y-5">
      <PageHeader title="Clientes" description="Gerencie os clientes da empresa">
        <Button size="sm" variant="outline" onClick={() => setOpenImport(true)}>
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
        <Button size="sm" onClick={() => setOpenForm(true)}>
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
        <span className="text-xs text-muted-foreground ml-auto">
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
              <button
                onClick={() => setSelectedClient(client)}
                className={cn(
                  "w-full text-left flex items-center gap-4 p-4 pr-12 rounded-xl border border-border bg-card hover:bg-accent/30 transition-colors group"
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
        onConfirm={() => { if (deleteTarget) deleteClient(deleteTarget.id); }}
      />
    </div>
  );
}
