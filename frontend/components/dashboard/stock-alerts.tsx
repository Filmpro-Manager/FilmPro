"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProductsStore } from "@/store/products-store";
import { isLowStock, filmTypeLabel } from "@/lib/utils";

export function StockAlerts() {
  const products = useProductsStore((s) => s.products);
  const lowStockItems = products.filter((p) =>
    isLowStock(p.availableMeters, p.minimumStock)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Alertas de Estoque
          </CardTitle>
          <Link
            href="/estoque"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Ver estoque <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lowStockItems.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">Estoque dentro do limite mínimo.</p>
          </div>
        ) : (
          lowStockItems.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">
                  {product.brand} {product.model}
                </p>
                <div className="flex items-center gap-1.5">
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                    {filmTypeLabel(product.type)}
                  </Badge>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {product.availableMeters}m
                </p>
                <p className="text-xs text-muted-foreground">mín. {product.minimumStock}m</p>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
