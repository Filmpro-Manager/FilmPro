"use client";

import { useMemo } from "react";
import { Package, AlertTriangle, CircleOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { Product, Appointment } from "@/types";
import type { DashFilter } from "./dash-filter-bar";

interface Props {
  products: Product[];
  services: Appointment[];
  filter: DashFilter;
}

export function DashEstoque({ products, services, filter }: Props) {
  const stats = useMemo(() => {
    const belowMin  = products.filter((p) => p.availableMeters < p.minimumStock);
    const critical  = products.filter((p) => p.availableMeters === 0);

    // Custo total de material consumido no período
    const materialCost = services
      .filter((s) => s.date >= filter.from && s.date <= filter.to && s.status === "completed")
      .reduce((a, s) => a + (s.materialCost ?? 0), 0);

    const totalRevenue = services
      .filter((s) => s.date >= filter.from && s.date <= filter.to && s.status === "completed")
      .reduce((a, s) => a + s.value, 0);

    const marginImpact = totalRevenue > 0 ? (materialCost / totalRevenue) * 100 : 0;

    return { belowMin, critical, materialCost, marginImpact, totalProducts: products.length };
  }, [products, services, filter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Estoque</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "flex items-center gap-2.5 rounded-lg p-2.5",
            stats.belowMin.length > 0 ? "bg-amber-500/10" : "bg-muted/40"
          )}>
            <AlertTriangle className={cn("w-5 h-5 shrink-0", stats.belowMin.length > 0 ? "text-amber-500" : "text-muted-foreground")} />
            <div>
              <p className={cn("text-base font-bold leading-none", stats.belowMin.length > 0 ? "text-amber-500" : "text-foreground")}>
                {stats.belowMin.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Abaixo mínimo</p>
            </div>
          </div>

          <div className={cn(
            "flex items-center gap-2.5 rounded-lg p-2.5",
            stats.critical.length > 0 ? "bg-destructive/10" : "bg-muted/40"
          )}>
            <CircleOff className={cn("w-5 h-5 shrink-0", stats.critical.length > 0 ? "text-destructive" : "text-muted-foreground")} />
            <div>
              <p className={cn("text-base font-bold leading-none", stats.critical.length > 0 ? "text-destructive" : "text-foreground")}>
                {stats.critical.length}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Zerados</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Custo de material</span>
            <span className="font-semibold text-foreground">{formatCurrency(stats.materialCost)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Impacto na margem</span>
            <span className={cn("font-semibold", stats.marginImpact > 40 ? "text-destructive" : stats.marginImpact > 25 ? "text-amber-500" : "text-emerald-500")}>
              {stats.marginImpact.toFixed(1)}%
            </span>
          </div>
        </div>

        {stats.belowMin.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Produtos críticos</p>
            {stats.belowMin.slice(0, 3).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs">
                <span className="truncate text-foreground">{p.brand} {p.model}</span>
                <span className="text-amber-500 font-medium shrink-0 ml-2">{p.availableMeters}m</span>
              </div>
            ))}
            {stats.belowMin.length > 3 && (
              <p className="text-[10px] text-muted-foreground">+{stats.belowMin.length - 3} mais</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
