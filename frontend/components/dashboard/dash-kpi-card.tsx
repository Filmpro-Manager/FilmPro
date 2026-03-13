"use client";

import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface DashKpiCardProps {
  label: string;
  value: number | string;
  isCurrency?: boolean;
  trend?: number;
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
      <CardContent className="p-4 flex flex-col gap-3">
        {/* Linha superior: label + ícone */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
            {label}
          </p>
          {Icon && (
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              variant === "default"     && "bg-primary/10 text-primary",
              variant === "success"     && "bg-emerald-500/10 text-emerald-500",
              variant === "warning"     && "bg-amber-500/10 text-amber-500",
              variant === "destructive" && "bg-destructive/10 text-destructive",
            )}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Valor */}
        <p className="text-2xl font-bold text-foreground leading-tight break-all">
          {display}
        </p>

        {/* Linha inferior: trend ou sub */}
        {(trend !== undefined || trendLabel || sub) && (
          <div className="flex items-center gap-1.5 flex-wrap">
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
        )}
      </CardContent>
    </Card>
  );
}
