"use client";

import { useState, useMemo } from "react";
import { Plus, AlertTriangle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ProductFormDialog } from "@/components/estoque/product-form-dialog";
import { StockMovementDialog } from "@/components/estoque/stock-movement-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { mockStockMovements } from "@/data/mock";
import { useProductsStore } from "@/store/products-store";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { formatCurrency, filmTypeLabel, isLowStock, formatDate } from "@/lib/utils";
import type { Product, TableColumn } from "@/types";
import { cn } from "@/lib/utils";

export default function EstoquePage() {
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [openMovement, setOpenMovement] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const products = useProductsStore((s) => s.products);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        filmTypeLabel(p.type).toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q)
    );
  }, [search, products]);

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

  const movementColumns: TableColumn<(typeof mockStockMovements)[0]>[] = [
    {
      key: "date",
      header: "Data",
      render: (row) => <span>{formatDate(row.date, "dd/MM/yy HH:mm")}</span>,
    },
    {
      key: "productName",
      header: "Produto",
    },
    {
      key: "type",
      header: "Tipo",
      render: (row) => (
        <Badge variant={row.type === "in" ? "success" : "destructive"}>
          {row.type === "in" ? "Entrada" : "Saída"}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Qtd (m)",
      render: (row) => (
        <span className={cn("font-medium", row.type === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
          {row.type === "in" ? "+" : "-"}{row.quantity}m
        </span>
      ),
      className: "text-right",
    },
    {
      key: "reason",
      header: "Motivo",
    },
    {
      key: "userName",
      header: "Usuário",
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

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">Películas</TabsTrigger>
          <TabsTrigger value="movements">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Buscar marca, modelo, SKU..."
              className="max-w-sm"
            />
            <span className="text-xs text-muted-foreground ml-auto">
              {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
            </span>
          </div>
          <DataTable columns={columns} data={filtered} keyField="id" />
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <DataTable
            columns={movementColumns}
            data={mockStockMovements}
            keyField="id"
            emptyMessage="Nenhuma movimentação registrada."
          />
        </TabsContent>
      </Tabs>

      <ProductFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        product={editProduct}
      />
      <StockMovementDialog
        open={openMovement}
        onOpenChange={setOpenMovement}
      />
      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        itemName={deleteTarget?.name ?? ""}
        itemType="película"
        onConfirm={() => { if (deleteTarget) deleteProduct(deleteTarget.id); }}
      />
    </div>
  );
}
