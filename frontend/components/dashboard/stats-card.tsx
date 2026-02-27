import { TrendingUp, TrendingDown, LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  description?: string;
  isCurrency?: boolean;
  variant?: "default" | "warning" | "success" | "destructive";
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  isCurrency,
  variant = "default",
}: StatsCardProps) {
  const displayValue = isCurrency
    ? formatCurrency(Number(value))
    : String(value);

  const trendPositive = trend !== undefined && trend >= 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-2xl font-semibold text-foreground leading-none">{displayValue}</p>
            {(trend !== undefined || description) && (
              <div className="flex items-center gap-1.5">
                {trend !== undefined && (
                  <div
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      trendPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                    )}
                  >
                    {trendPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{Math.abs(trend).toFixed(1)}%</span>
                  </div>
                )}
                {description && (
                  <span className="text-xs text-muted-foreground">{description}</span>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ml-4",
              variant === "default" && "bg-primary/10 text-primary",
              variant === "warning" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
              variant === "success" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
              variant === "destructive" && "bg-destructive/10 text-destructive"
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
