"use client";

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface DashKpiCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  trend?: number;        // % em relação ao período anterior
  trendLabel?: string;
  icon?: LucideIcon;
  variant?: "default" | "success" | "warning" | "destructive";
  size?: "default" | "lg";
  sub?: string;
}

export function DashKpiCard({
  label,
  value,
  isCurrency,
  trend,
  trendLabel,
  icon: Icon,
  variant = "default",
  size = "default",
  sub,
}: DashKpiCardProps) {
  const display = isCurrency ? formatCurrency(Number(value)) : String(value);
  const trendUp = trend !== undefined && trend >= 0;

  return (
    <Card className="relative overflow-hidden">
      <CardContent className={cn("p-4", size === "lg" && "p-5")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
              {label}
            </p>
            <p className={cn(
              "font-bold leading-none text-foreground",
              size === "lg" ? "text-3xl" : "text-2xl"
            )}>
              {display}
            </p>
            <div className="flex items-center gap-1.5 min-h-[16px]">
              {trend !== undefined && (
                <span className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold",
                  trendUp ? "text-emerald-500" : "text-destructive"
                )}>
                  {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(trend).toFixed(1)}%
                </span>
              )}
              {(trendLabel || sub) && (
                <span className="text-[11px] text-muted-foreground">{trendLabel ?? sub}</span>
              )}
            </div>
          </div>

          {Icon && (
            <div className={cn(
              "flex items-center justify-center rounded-xl shrink-0",
              size === "lg" ? "w-12 h-12" : "w-9 h-9",
              variant === "default"     && "bg-primary/10 text-primary",
              variant === "success"     && "bg-emerald-500/10 text-emerald-500",
              variant === "warning"     && "bg-amber-500/10 text-amber-500",
              variant === "destructive" && "bg-destructive/10 text-destructive",
            )}>
              <Icon className={cn(size === "lg" ? "w-6 h-6" : "w-4 h-4")} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
