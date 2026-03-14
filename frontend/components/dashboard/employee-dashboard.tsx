"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays,
  ClipboardList,
  Users,
  FileSignature,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { useServicesStore } from "@/store/services-store";
import { useClientsStore } from "@/store/clients-store";
import { useQuotesStore } from "@/store/quotes-store";
import { useAuthStore } from "@/store/auth-store";

export function EmployeeDashboard() {
  const { user } = useAuthStore();
  const services = useServicesStore((s) => s.services);
  const clients  = useClientsStore((s) => s.clients);
  const quotes   = useQuotesStore((s) => s.quotes);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  const { upcoming, todayOS, pendingQuotes, recentClients } = useMemo(() => {
    const upcoming = services
      .filter((s) => s.date >= today && (s.status === "scheduled" || s.status === "in_progress"))
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      })
      .slice(0, 6);

    const todayOS = services
      .filter((s) => s.date === today)
      .sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? ""))
      .slice(0, 6);

    const pendingQuotes = quotes
      .filter((q) => q.status === "draft" || q.status === "sent")
      .slice(0, 5);

    const recentClients = [...clients]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);

    return { upcoming, todayOS, pendingQuotes, recentClients };
  }, [services, clients, quotes, today]);

  return (
    <div className="space-y-5">
      {/* Saudação */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Olá, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground capitalize">{todayLabel}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos agendamentos */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                Próximos Agendamentos
              </CardTitle>
              <Link
                href="/agenda"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Ver agenda <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum agendamento próximo.
              </p>
            ) : (
              upcoming.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                    <CalendarDays className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{appt.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{appt.serviceType}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {appt.date === today ? "Hoje" : appt.date}
                      {appt.startTime ? ` · ${appt.startTime}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* OS do dia */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                OS do Dia
              </CardTitle>
              <Link
                href="/ordens-de-servico"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayOS.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma OS para hoje.
              </p>
            ) : (
              todayOS.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.clientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.serviceType}</p>
                    {s.employeeName && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Responsável: {s.employeeName}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Orçamentos pendentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-primary" />
                Orçamentos Pendentes
              </CardTitle>
              <Link
                href="/orcamentos"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingQuotes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum orçamento pendente.
              </p>
            ) : (
              pendingQuotes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.number} · Válido até {q.validUntil}
                    </p>
                  </div>
                  <Badge
                    variant={q.status === "sent" ? "blue" : "secondary"}
                    className="text-xs shrink-0 ml-2"
                  >
                    {q.status === "sent" ? "Enviado" : "Rascunho"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Clientes recentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Clientes Recentes
              </CardTitle>
              <Link
                href="/clientes"
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentClients.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum cliente cadastrado.
              </p>
            ) : (
              recentClients.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0 text-xs font-bold text-primary">
                    {c.name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.phone}</p>
                  </div>
                  {c.vehicle && (
                    <p className="text-xs text-muted-foreground shrink-0">
                      {c.vehicle.brand} {c.vehicle.model}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
