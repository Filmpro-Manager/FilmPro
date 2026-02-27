"use client";

import { useMemo } from "react";
import { Users, UserX, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";
import type { Client, Appointment } from "@/types";
import type { DashFilter } from "./dash-filter-bar";

interface Props {
  clients: Client[];
  services: Appointment[];
  filter: DashFilter;
}

export function DashClientes({ clients, services, filter }: Props) {
  const stats = useMemo(() => {
    // Novos clientes no período
    const newClients = clients.filter((c) => c.createdAt >= filter.from && c.createdAt.slice(0, 10) <= filter.to).length;

    // Clientes inativos (sem serviços nos últimos 90 dias)
    const ninetyAgo = new Date();
    ninetyAgo.setDate(ninetyAgo.getDate() - 90);
    const cutoff = ninetyAgo.toISOString().slice(0, 10);
    const inactive = clients.filter((c) => {
      const hist = c.serviceHistory;
      if (!hist.length) return false;
      const last = hist.reduce((a, b) => (a.date > b.date ? a : b));
      return last.date < cutoff;
    }).length;

    // Top cliente do período (por receita)
    const revenueByClient: Record<string, number> = {};
    services
      .filter((s) => s.date >= filter.from && s.date <= filter.to && s.status === "completed")
      .forEach((s) => { revenueByClient[s.clientId] = (revenueByClient[s.clientId] ?? 0) + s.value; });
    const topClientId = Object.entries(revenueByClient).sort((a, b) => b[1] - a[1])[0];
    const topClient = topClientId ? clients.find((c) => c.id === topClientId[0]) : null;
    const topRevenue = topClientId?.[1] ?? 0;

    return { newClients, inactive, topClient, topRevenue };
  }, [clients, services, filter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 shrink-0">
              <Users className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.newClients}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Novos no período</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2.5">
            <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
              stats.inactive > 0 ? "bg-amber-500/10" : "bg-muted"
            )}>
              <UserX className={cn("w-4 h-4", stats.inactive > 0 ? "text-amber-500" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-base font-bold leading-none text-foreground">{stats.inactive}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Inativos (+90d)</p>
            </div>
          </div>
        </div>

        {stats.topClient && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 shrink-0">
              <Crown className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Top do período</p>
              <p className="text-sm font-semibold text-foreground truncate">{stats.topClient.name}</p>
              <p className="text-[11px] text-emerald-500 font-medium">{formatCurrency(stats.topRevenue)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
