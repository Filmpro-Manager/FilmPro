"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Search,
  X,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { QuoteFormDialog } from "@/components/orcamentos/quote-form-dialog";
import { QuoteDetailDialog } from "@/components/orcamentos/quote-detail-dialog";
import { FollowupPanel } from "@/components/orcamentos/followup-panel";
import { useQuotesStore } from "@/store/quotes-store";
import { useAuthStore } from "@/store/auth-store";
import { useServicesStore } from "@/store/services-store";
import { apiGetQuotes, apiDeleteQuote, apiUpdateQuoteStatus, apiGetServiceOrders, apiGetUsers, type ApiQuote, type ApiServiceOrder, type UserProfile } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Quote, TableColumn, QuoteStatus, QuoteSubject, QuotePayment, Appointment } from "@/types";
import { cn } from "@/lib/utils";

// ─── Mapper ───────────────────────────────────────────────────────────────────

function mapApiQuote(api: ApiQuote): Quote {
  return {
    id: api.id,
    number: api.number,
    issueDate: api.issueDate.slice(0, 10),
    validUntil: api.validUntil ? api.validUntil.slice(0, 10) : "",
    status: api.status as QuoteStatus,
    clientId: api.clientId ?? "",
    clientName: api.clientName,
    clientPhone: api.clientPhone ?? undefined,
    clientEmail: api.clientEmail ?? undefined,
    clientDocument: api.clientDocument ?? undefined,
    clientDocumentType: (api.clientDocumentType as "cpf" | "cnpj" | undefined) ?? undefined,
    category: api.category as Quote["category"],
    subject: api.subject as QuoteSubject | undefined,
    sellerId: api.sellerId ?? undefined,
    sellerName: api.sellerName ?? undefined,
    createdById: api.createdById ?? undefined,
    createdByName: api.createdByName ?? undefined,
    items: api.items.map((item) => ({
      id: item.id,
      type: item.type as Quote["items"][0]["type"],
      name: item.name,
      description: item.description ?? undefined,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      discount: item.discount,
      discountType: item.discountType as "value" | "percent",
      total: item.total,
      productId: item.productId ?? undefined,
      serviceId: item.serviceId ?? undefined,
      vehicleId: item.vehicleId ?? undefined,
    })),
    subtotal: api.subtotal,
    discount: api.discount,
    discountType: api.discountType as "value" | "percent" | undefined,
    taxes: api.taxes ?? undefined,
    totalValue: api.totalValue,
    acceptedPaymentMethods: api.acceptedPaymentMethods,
    payment: api.payment as QuotePayment | undefined,
    notes: api.notes ?? undefined,
    internalNotes: api.internalNotes ?? undefined,
    convertedAt: api.convertedAt ?? undefined,
    convertedToAppointmentId: api.convertedToAppointmentId ?? undefined,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

function mapApiServiceOrder(api: ApiServiceOrder): Appointment {
  return {
    id: api.id,
    clientId: api.clientId ?? "",
    clientName: api.clientName,
    vehicle: api.vehicle ?? "—",
    serviceType: api.serviceType,
    employeeId: api.employeeId ?? "",
    employeeName: api.employeeName ?? "",
    quoteId: api.quoteId ?? undefined,
    date: api.date,
    endDate: api.endDate ?? undefined,
    startTime: api.startTime ?? undefined,
    endTime: api.endTime ?? undefined,
    status: api.status as Appointment["status"],
    value: api.value,
    notes: api.notes ?? undefined,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft:     "Pendente",
  sent:      "Enviado",
  approved:  "Aprovado",
  converted: "Convertido",
  expired:   "Expirado",
  rejected:  "Recusado",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  draft:     "bg-slate-100 text-slate-700 border-slate-200",
  sent:      "bg-green-100 text-green-700 border-green-300",
  approved:  "bg-violet-100 text-violet-700 border-violet-300",
  converted: "bg-blue-100 text-blue-700 border-blue-300",
  expired:   "bg-orange-100 text-orange-700 border-orange-300",
  rejected:  "bg-red-100 text-red-700 border-red-300",
};

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

type SortKey = "date_desc" | "date_asc" | "value_desc" | "value_asc" | "client_asc" | "client_desc";

const SORT_LABELS: Record<SortKey, string> = {
  date_desc:   "Mais recentes",
  date_asc:    "Mais antigos",
  value_desc:  "Maior valor",
  value_asc:   "Menor valor",
  client_asc:  "Cliente A→Z",
  client_desc: "Cliente Z→A",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrcamentosPage() {
  const [tab, setTab] = useState<"all" | QuoteStatus>("all");

  // Filtros
  const [search, setSearch]                   = useState("");
  const [filterMonth, setFilterMonth]         = useState<string>("all");
  const [filterYear, setFilterYear]           = useState<string>("all");
  const [filterCategory, setFilterCategory]   = useState<string>("all");
  const [filterMinValue, setFilterMinValue]   = useState("");
  const [filterMaxValue, setFilterMaxValue]   = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>("all");
  const [sort, setSort]                       = useState<SortKey>("date_desc");

  // Usuários (para filtro de criado por)
  const [users, setUsers] = useState<UserProfile[]>([]);

  // Dialogs
  const [openForm, setOpenForm]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Quote | undefined>(undefined);
  const [detailTarget, setDetailTarget] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { quotes, setQuotes, deleteQuote, updateStatus } = useQuotesStore();
  const { setServices } = useServicesStore();
  const { token } = useAuthStore();
  const isEmployee = useAuthStore((s) => s.user?.role === "EMPLOYEE");

  // ─── Carregar dados da API ────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    apiGetQuotes(token)
      .then((data) => setQuotes(data.map(mapApiQuote)))
      .catch(() => {});
    apiGetUsers(token)
      .then(setUsers)
      .catch(() => {});
    apiGetServiceOrders(token)
      .then((data) => setServices(data.map(mapApiServiceOrder)))
      .catch(() => {});
  }, [token]);

  const availableYears = useMemo(() => {
    const years = new Set(quotes.map((q) => q.createdAt.slice(0, 4)));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [quotes]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.trim())            n++;
    if (filterMonth !== "all")    n++;
    if (filterYear !== "all")     n++;
    if (filterCategory !== "all") n++;
    if (filterMinValue)           n++;
    if (filterMaxValue)           n++;
    if (filterCreatedBy !== "all") n++;
    return n;
  }, [search, filterMonth, filterYear, filterCategory, filterMinValue, filterMaxValue, filterCreatedBy]);

  function clearFilters() {
    setSearch(""); setFilterMonth("all"); setFilterYear("all");
    setFilterCategory("all"); setFilterMinValue(""); setFilterMaxValue("");
    setFilterCreatedBy("all");
  }

  const stats = useMemo(() => {
    const total        = quotes.length;
    const totalValue   = quotes.reduce((a, q) => a + q.totalValue, 0);
    const openValue    = quotes.filter((q) => q.status === "draft").reduce((a, q) => a + q.totalValue, 0);
    const avgTicket    = total > 0 ? totalValue / total : 0;
    const now          = new Date();
    const ym           = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const thisMonth    = quotes.filter((q) => q.createdAt.slice(0, 7) === ym).length;
    return { total, totalValue, openValue, avgTicket, thisMonth };
  }, [quotes]);

  const filtered = useMemo(() => {
    let result = [...quotes];

    if (tab !== "all") result = result.filter((q) => q.status === tab);

    const q = search.trim().toLowerCase();
    if (q) result = result.filter((r) =>
      r.clientName.toLowerCase().includes(q) ||
      r.number.toLowerCase().includes(q) ||
      (r.subject?.plate ?? "").toLowerCase().includes(q)
    );

    if (filterMonth !== "all") {
      const m = String(Number(filterMonth)).padStart(2, "0");
      result = result.filter((r) => r.createdAt.slice(5, 7) === m);
    }
    if (filterYear !== "all")
      result = result.filter((r) => r.createdAt.slice(0, 4) === filterYear);

    if (filterCategory !== "all")
      result = result.filter((r) => r.category === filterCategory);

    if (filterCreatedBy !== "all")
      result = result.filter((r) => r.createdById === filterCreatedBy);

    const minV = parseFloat(filterMinValue.replace(",", "."));
    const maxV = parseFloat(filterMaxValue.replace(",", "."));
    if (!isNaN(minV)) result = result.filter((r) => r.totalValue >= minV);
    if (!isNaN(maxV)) result = result.filter((r) => r.totalValue <= maxV);

    result.sort((a, b) => {
      switch (sort) {
        case "date_desc":   return b.createdAt.localeCompare(a.createdAt);
        case "date_asc":    return a.createdAt.localeCompare(b.createdAt);
        case "value_desc":  return b.totalValue - a.totalValue;
        case "value_asc":   return a.totalValue - b.totalValue;
        case "client_asc":  return a.clientName.localeCompare(b.clientName, "pt-BR");
        case "client_desc": return b.clientName.localeCompare(a.clientName, "pt-BR");
        default: return 0;
      }
    });

    return result;
  }, [quotes, tab, search, filterMonth, filterYear, filterCategory, filterMinValue, filterMaxValue, filterCreatedBy, sort]);

  function openNew() { setEditTarget(undefined); setOpenForm(true); }
  function openEdit(quote: Quote) { setEditTarget(quote); setOpenForm(true); }

  const allColumns: TableColumn<Quote>[] = [
    {
      key: "number",
      header: "Número",
      render: (row) => (
        <button className="font-mono text-sm font-medium text-primary hover:underline" onClick={() => setDetailTarget(row)}>
          {row.number}
        </button>
      ),
    },
    {
      key: "clientName",
      header: "Cliente",
      render: (row) => (
        <div>
          <span className="font-medium">{row.clientName}</span>
          {row.subject?.type === "vehicle" && row.subject.plate && (
            <p className="text-xs text-muted-foreground font-mono">{row.subject.plate}</p>
          )}
          {(row.subject?.type === "residence" || row.subject?.type === "commercial") && row.subject.address && (
            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{row.subject.address}</p>
          )}
        </div>
      ),
    },
    {
      key: "category",
      header: "Categoria",
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.category === "automotive" ? "Automotivo" : row.category === "residential" ? "Residencial" : "—"}
        </span>
      ),
    },
    {
      key: "items",
      header: "Itens",
      render: (row) => (
        <span className="text-muted-foreground text-sm">{row.items.length} {row.items.length === 1 ? "item" : "itens"}</span>
      ),
    },
    {
      key: "totalValue",
      header: "Valor",
      render: (row) => <span className="font-medium tabular-nums">{formatCurrency(row.totalValue)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="outline" className={cn("text-xs", STATUS_CLASSES[row.status])}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Criado em",
      render: (row) => (
        <div>
          <span className="text-muted-foreground text-sm">{formatDate(row.createdAt.slice(0, 10))}</span>
          {row.createdByName && (
            <p className="text-xs text-muted-foreground">{row.createdByName}</p>
          )}
        </div>
      ),
    },
    {
      key: "id",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status !== "sent" && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEdit(row)}>Editar</Button>
          )}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteTarget({ id: row.id, name: row.number })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const columns = allColumns.filter((col) => !isEmployee || col.key !== "totalValue");

  return (
    <div className="space-y-6">
      <PageHeader title="Orçamentos" description="Gerencie propostas comerciais e acompanhe a taxa de conversão">
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo Orçamento
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total de orçamentos</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">{stats.thisMonth} criado{stats.thisMonth !== 1 ? "s" : ""} este mês</p>
        </CardContent></Card>
        {!isEmployee && (
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Valor total</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats.totalValue)}</p>
            <p className="text-xs text-muted-foreground">soma de todos os orçamentos</p>
          </CardContent></Card>
        )}
        {!isEmployee && (
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Em aberto</p>
            <p className="text-2xl font-bold tabular-nums text-yellow-500">{formatCurrency(stats.openValue)}</p>
            <p className="text-xs text-muted-foreground">orçamentos não enviados</p>
          </CardContent></Card>
        )}
        {!isEmployee && (
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Ticket médio</p>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(stats.avgTicket)}</p>
            <p className="text-xs text-muted-foreground">por orçamento</p>
          </CardContent></Card>
        )}
      </div>

      <FollowupPanel quotes={quotes} onOpenQuote={(q) => setDetailTarget(q)} />

      {/* Tabs + Filtros + Tabela */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        {/* Barra de controles */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="draft">Pendentes</TabsTrigger>
            <TabsTrigger value="sent">Enviados</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Cliente, número ou placa…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 w-52 text-sm"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtros avançados */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-sm">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtros
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
                {/* Cabeçalho */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
                  <p className="text-sm font-semibold">Filtros avançados</p>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                      <X className="h-3 w-3" /> Limpar tudo
                    </button>
                  )}
                </div>

                {/* Corpo */}
                <div className="p-4 space-y-4">
                  {/* Período */}
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Período</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Mês</label>
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                          <SelectTrigger className="h-9 text-sm bg-secondary border-border">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">Ano</label>
                        <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="h-9 text-sm bg-secondary border-border">
                            <SelectValue placeholder="Todos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Categoria */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Categoria</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="h-9 text-sm bg-secondary border-border">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        <SelectItem value="automotive">Automotivo</SelectItem>
                        <SelectItem value="architecture">Arquitetura</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Faixa de valor */}
                  {!isEmployee && (
                    <>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Faixa de valor (R$)</label>
                        <div className="flex gap-2 items-center">
                          <Input
                            placeholder="Mínimo"
                            value={filterMinValue}
                            onChange={(e) => setFilterMinValue(e.target.value.replace(/[^\d,.]/g, ""))}
                            className="h-9 text-sm bg-secondary border-border"
                          />
                          <span className="text-muted-foreground text-xs shrink-0">—</span>
                          <Input
                            placeholder="Máximo"
                            value={filterMaxValue}
                            onChange={(e) => setFilterMaxValue(e.target.value.replace(/[^\d,.]/g, ""))}
                            className="h-9 text-sm bg-secondary border-border"
                          />
                        </div>
                      </div>
                      <Separator />
                    </>
                  )}

                  {/* Criado por */}
                  {users.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Criado por</label>
                      <Select value={filterCreatedBy} onValueChange={setFilterCreatedBy}>
                        <SelectTrigger className="h-9 text-sm bg-secondary border-border">
                          <SelectValue placeholder="Todos os usuários" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          {users.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Ordenação */}
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-8 w-auto gap-1.5 text-sm border">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                  <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Chips de filtros ativos */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {search && <FilterChip label={`"${search}"`} onRemove={() => setSearch("")} />}
            {filterMonth !== "all" && <FilterChip label={MONTHS[Number(filterMonth) - 1]} onRemove={() => setFilterMonth("all")} />}
            {filterYear !== "all" && <FilterChip label={filterYear} onRemove={() => setFilterYear("all")} />}
            {filterCategory !== "all" && <FilterChip label={filterCategory === "automotive" ? "Automotivo" : "Arquitetura"} onRemove={() => setFilterCategory("all")} />}
            {filterMinValue && <FilterChip label={`≥ R$ ${filterMinValue}`} onRemove={() => setFilterMinValue("")} />}
            {filterMaxValue && <FilterChip label={`≤ R$ ${filterMaxValue}`} onRemove={() => setFilterMaxValue("")} />}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1">
              Limpar todos
            </button>
          </div>
        )}

        <TabsContent value={tab} className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            {filtered.length} {filtered.length === 1 ? "orçamento encontrado" : "orçamentos encontrados"}
          </p>
          <DataTable columns={columns} data={filtered} keyField="id" emptyMessage="Nenhum orçamento encontrado para os filtros selecionados." />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuoteFormDialog open={openForm} onOpenChange={setOpenForm} initialQuote={editTarget} />

      <QuoteDetailDialog
        open={!!detailTarget}
        onOpenChange={(open) => !open && setDetailTarget(null)}
        quote={detailTarget}
        onEdit={(q) => { setDetailTarget(null); openEdit(q); }}
        onStatusChange={async (id, status) => {
          if (!token) return;
          try {
            await apiUpdateQuoteStatus(id, status, token);
            updateStatus(id, status as QuoteStatus);
          } catch {/* silencia */}
        }}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget || !token) return;
          try {
            await apiDeleteQuote(deleteTarget.id, token);
            deleteQuote(deleteTarget.id);
          } catch {
            // erro silenciado — toast poderia ser adicionado aqui
          }
          setDeleteTarget(null);
        }}
        itemType="orçamento"
        itemName={deleteTarget?.name ?? ""}
      />
    </div>
  );
}

// ─── Sub-component ────────────────────────────────────────────────────────────

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-muted border rounded-full px-2.5 py-1">
      {label}
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-0.5">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}


