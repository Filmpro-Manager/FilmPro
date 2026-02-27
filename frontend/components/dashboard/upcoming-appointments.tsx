"use client";

import Link from "next/link";
import { CalendarDays, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useServicesStore } from "@/store/services-store";
import { formatCurrency } from "@/lib/utils";

export function UpcomingAppointments() {
  const services = useServicesStore((s) => s.services);
  const upcoming = services
    .filter((a) => a.status === "scheduled" || a.status === "in_progress")
    .slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Próximos Agendamentos</CardTitle>
          <Link
            href="/agenda"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {upcoming.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <p className="text-sm text-muted-foreground">Nenhum agendamento pendente.</p>
          </div>
        ) : (
          upcoming.map((appt) => (
            <div
              key={appt.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                <CalendarDays className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-sm font-medium text-foreground truncate">{appt.clientName}</p>
                <p className="text-xs text-muted-foreground truncate">{appt.serviceType}</p>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {appt.date} · {appt.startTime}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge status={appt.status} />
                <span className="text-xs font-medium text-foreground">
                  {formatCurrency(appt.value)}
                </span>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
