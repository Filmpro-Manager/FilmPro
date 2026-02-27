"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ReportKpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: number;    // positive = good, negative = bad (percent already)
  icon?: LucideIcon;
  valueColor?: "default" | "green" | "red" | "blue" | "yellow";
  className?: string;
}

export function ReportKpiCard({
  label, value, sub, trend, icon: Icon, valueColor = "default", className,
}: ReportKpiCardProps) {
  const trendUp = trend !== undefined && trend > 0;
  const trendDn = trend !== undefined && trend < 0;

  return (
    <Card className={cn("transition-all duration-200", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate mb-1">{label}</p>
            <p className={cn(
              "text-xl font-bold leading-tight",
              valueColor === "green" && "text-green-500",
              valueColor === "red"   && "text-destructive",
              valueColor === "blue"  && "text-primary",
              valueColor === "yellow"&& "text-yellow-500",
            )}>
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</p>}
            {trend !== undefined && (
              <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium",
                trendUp ? "text-green-500" : trendDn ? "text-destructive" : "text-muted-foreground"
              )}>
                {trendUp ? <TrendingUp className="h-3 w-3" /> : trendDn ? <TrendingDown className="h-3 w-3" /> : null}
                {trend > 0 ? "+" : ""}{trend.toFixed(1)}% vs anterior
              </div>
            )}
          </div>
          {Icon && (
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
