"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, AlertTriangle, Trash2, Filter } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ProductFormDialog } from "@/components/estoque/product-form-dialog";
import { StockMovementDialog } from "@/components/estoque/stock-movement-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useProductsStore, mapApiItemToProduct } from "@/store/products-store";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { formatCurrency, filmTypeLabel, isLowStock, formatDate } from "@/lib/utils";
import {
  apiGetInventoryItems,
  apiDeleteInventoryItem,
  apiGetInventoryMovements,
  type ApiInventoryMovement,
} from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import type { Product, TableColumn } from "@/types";
import { cn } from "@/lib/utils";

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [filterMovType, setFilterMovType] = useState("all");
  const [openForm, setOpenForm] = useState(false);
  const [openMovement, setOpenMovement] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<ApiInventoryMovement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const products = useProductsStore((s) => s.products);
  const setProducts = useProductsStore((s) => s.setProducts);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const token = useAuthStore((s) => s.token) ?? "";

  const loadItems = useCallback(async () => {
    try {
      const items = await apiGetInventoryItems(token);
      setProducts(items.map(mapApiItemToProduct));
    } catch {
      toast.error("Erro ao carregar estoque");
    }
  }, [token, setProducts]);

  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await apiGetInventoryMovements(token);
      setMovements(data);
    } catch {
      toast.error("Erro ao carregar movimentações");
    } finally {
      setLoadingMovements(false);
    }
  }, [token]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await apiDeleteInventoryItem(deleteTarget.id, token);
      deleteProduct(deleteTarget.id);
    } catch {
      toast.error("Erro ao excluir item");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const matchSearch =
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        filmTypeLabel(p.type).toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q);
      const matchType = filterType === "all" || p.type === filterType;
      const matchLow = !filterLowStock || isLowStock(p.availableMeters, p.minimumStock);
      return matchSearch && matchType && matchLow;
    });
  }, [search, products, filterType, filterLowStock]);

  const filteredMovements = useMemo(() => {
    if (filterMovType === "all") return movements;
    return movements.filter((m) => m.type === filterMovType);
  }, [movements, filterMovType]);

  const columns: TableColumn<Product>[] = [
    {
      key: "brand",
      header: "Produto",
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.brand} {row.model}</p>
          <p className="text-xs text-muted-foreground">{row.sku ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      render: (row) => <Badge variant="secondary">{filmTypeLabel(row.type)}</Badge>,
    },
    {
      key: "transparency",
      header: "Transpar.",
      render: (row) => <span>{row.transparency}%</span>,
      className: "text-right",
    },
    {
      key: "availableMeters",
      header: "Disponível",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {isLowStock(row.availableMeters, row.minimumStock) && (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          )}
          <span
            className={cn(
              "font-medium",
              isLowStock(row.availableMeters, row.minimumStock)
                ? "text-amber-600 dark:text-amber-400"
                : "text-foreground"
            )}
          >
            {row.availableMeters}m
          </span>
          <span className="text-xs text-muted-foreground">/ mín {row.minimumStock}m</span>
        </div>
      ),
    },
    {
      key: "costPrice",
      header: "Custo/m",
      render: (row) => <span className="text-muted-foreground">{formatCurrency(row.costPrice)}</span>,
      className: "text-right hidden sm:table-cell",
    },
    {
      key: "pricePerMeter",
      header: "Venda/m",
      render: (row) => <span className="font-medium">{formatCurrency(row.pricePerMeter)}</span>,
      className: "text-right",
    },
    {
      key: "margin",
      header: "Margem",
      render: (row) => {
        const margin = row.costPrice > 0
          ? ((row.pricePerMeter - row.costPrice) / row.costPrice) * 100
          : 0;
        return (
          <span className={`text-xs font-medium ${margin >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
            +{margin.toFixed(0)}%
          </span>
        );
      },
      className: "text-right hidden md:table-cell",
    },
    {
      key: "createdBy",
      header: "Cadastrado por",
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.createdBy?.name ?? "—"}
        </span>
      ),
      className: "hidden lg:table-cell",
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setEditProduct(row); setOpenForm(true); }}
            className="h-7 text-xs"
          >
            Editar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget({ id: row.id, name: `${row.brand} ${row.model}` })}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
      className: "text-right w-28",
    },
  ];

  const movementColumns: TableColumn<ApiInventoryMovement>[] = [
    {
      key: "createdAt",
      header: "Data",
      render: (row) => <span>{formatDate(row.createdAt, "dd/MM/yy HH:mm")}</span>,
    },
    {
      key: "inventoryItem",
      header: "Produto",
      render: (row) => <span>{row.inventoryItem.brand} {row.inventoryItem.name}</span>,
    },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <Badge variant={row.type === "entrada" ? "success" : row.type === "saida" ? "destructive" : "secondary"}>
          {row.type === "entrada" ? "Entrada" : row.type === "saida" ? "Saída" : "Ajuste"}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Qtd",
      render: (row) => (
        <span className={cn(
          "font-medium",
          row.type === "entrada" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
        )}>
          {row.type === "entrada" ? "+" : "-"}{row.quantity}m
        </span>
      ),
      className: "text-right",
    },
    {
      key: "reason",
      header: "Motivo",
      render: (row) => <span>{row.reason ?? "—"}</span>,
    },
    {
      key: "user",
      header: "Usuário",
      render: (row) => <span>{row.user.name}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Estoque" description="Controle de películas e movimentações">
        <Button size="sm" variant="outline" onClick={() => setOpenMovement(true)}>
          Registrar Movimentação
        </Button>
        <Button size="sm" onClick={() => { setEditProduct(null); setOpenForm(true); }}>
          <Plus className="h-4 w-4" />
          Nova Película
        </Button>
      </PageHeader>

      <Tabs defaultValue="products" onValueChange={(v) => { if (v === "movements") loadMovements(); }}>
        <TabsList>
          <TabsTrigger value="products">Películas</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Buscar marca, modelo, SKU..."
                className="max-w-sm"
              />
              <Button
                variant={filterLowStock ? "default" : "outline"}
                size="sm"
                className="gap-1.5 shrink-0"
                onClick={() => setFilterLowStock((v) => !v)}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Estoque baixo
              </Button>
              <span className="text-xs text-muted-foreground ml-auto shrink-0">
                {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["all", "adesivo", "pelicula", "ppf"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filterType === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                  )}
                >
                  {t === "all" ? "Todos" : filmTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>
          <DataTable columns={columns} data={filtered} keyField="id" />
        </TabsContent>

        <TabsContent value="movements" className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            {(["all", "entrada", "saida"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterMovType(t)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filterMovType === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                {t === "all" ? "Todos" : t === "entrada" ? "Entrada" : "Saída"}
              </button>
            ))}
            <span className="text-xs text-muted-foreground ml-auto">
              {filteredMovements.length} {filteredMovements.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          <DataTable
            columns={movementColumns}
            data={filteredMovements}
            keyField="id"
            emptyMessage={loadingMovements ? "Carregando..." : "Nenhuma movimentação registrada."}
          />
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={openForm}
        onOpenChange={(v) => { setOpenForm(v); if (!v) loadItems(); }}
        product={editProduct}
      />
      <StockMovementDialog
        open={openMovement}
        onOpenChange={(v) => { setOpenMovement(v); if (!v) { loadItems(); loadMovements(); } }}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="película"
        onConfirm={handleDelete}
      />
    </div>
  );
}
