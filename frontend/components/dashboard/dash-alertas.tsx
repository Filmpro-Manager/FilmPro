"use client";

import { useMemo } from "react";
import { AlertTriangle, CreditCard, FileSignature, Target, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Alert } from "@/types";

interface Props {
  alerts: Alert[];
}

const ICON_MAP: Record<string, React.ElementType> = {
  low_stock:       AlertTriangle,
  overdue_payment: CreditCard,
  quote_expiring:  FileSignature,
  goal_at_risk:    Target,
  idle_client:     Info,
  cashflow_warning:AlertTriangle,
  rework_detected: AlertTriangle,
};

const SEV_COLOR: Record<string, string> = {
  critical: "text-destructive bg-destructive/10 border-destructive/20",
  warning:  "text-amber-500 bg-amber-500/10 border-amber-500/20",
  info:     "text-blue-500 bg-blue-500/10 border-blue-500/20",
};

const SEV_DOT: Record<string, string> = {
  critical: "bg-destructive",
  warning:  "bg-amber-500",
  info:     "bg-blue-500",
};

export function DashAlertas({ alerts }: Props) {
  const visible = useMemo(
    () => alerts.filter((a) => !a.isRead).sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    }).slice(0, 6),
    [alerts]
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Alertas Importantes</CardTitle>
          {visible.length > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold">
              {visible.length}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Nenhum alerta ativo. Tudo certo!
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((a) => {
              const Icon = ICON_MAP[a.type] ?? Info;
              return (
                <div key={a.id} className={cn(
                  "flex items-start gap-2.5 rounded-lg border p-2.5 text-xs",
                  SEV_COLOR[a.severity]
                )}>
                  <Icon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-semibold leading-none">{a.title}</p>
                    <p className="text-[11px] mt-0.5 opacity-80 line-clamp-2">{a.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
