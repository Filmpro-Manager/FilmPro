"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
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
import { DataTable } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import { QuoteFormDialog } from "@/components/orcamentos/quote-form-dialog";
import { QuoteDetailDialog } from "@/components/orcamentos/quote-detail-dialog";
import { useQuotesStore } from "@/store/quotes-store";
import { useAuthStore } from "@/store/auth-store";
import { useServicesStore } from "@/store/services-store";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Quote, TableColumn, QuoteStatus, Appointment } from "@/types";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const [tab, setTab] = useState<"all" | QuoteStatus>("all");

  // Filtros
  const [search, setSearch]                   = useState("");
  const [filterMonth, setFilterMonth]         = useState<string>("all");
  const [filterYear, setFilterYear]           = useState<string>("all");
  const [filterCategory, setFilterCategory]   = useState<string>("all");
  const [filterMinValue, setFilterMinValue]   = useState("");
  const [filterMaxValue, setFilterMaxValue]   = useState("");
  const [sort, setSort]                       = useState<SortKey>("date_desc");

  // Dialogs
  const [openForm, setOpenForm]         = useState(false);
  const [editTarget, setEditTarget]     = useState<Quote | undefined>(undefined);
  const [detailTarget, setDetailTarget] = useState<Quote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const { quotes, deleteQuote, updateStatus, convertToAppointment } = useQuotesStore();
  const { addService } = useServicesStore();
  const isEmployee = useAuthStore((s) => s.user?.role === "EMPLOYEE");

  // ─── Converter orçamento em OS ──────────────────────────────────────────────
  function handleConvert(quote: Quote) {
    const sub = quote.subject;
    let vehicle = "—";
    if (sub?.type === "vehicle") {
      const parts = [sub.brand, sub.model, sub.year].filter(Boolean).join(" ");
      vehicle = sub.plate ? `${parts} — ${sub.plate}` : parts || "—";
    } else if (sub?.address) {
      vehicle = sub.address;
    } else if (sub?.description) {
      vehicle = sub.description;
    }

    const serviceType =
      quote.items.find((i) => i.type === "service")?.name ??
      quote.items[0]?.name ??
      "Serviço";

    const newOsId = `svc-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    const newOs: Appointment = {
      id: newOsId,
      clientId: quote.clientId,
      clientName: quote.clientName,
      vehicle,
      serviceType,
      employeeId: "",
      employeeName: "",
      quoteId: quote.id,
      date: today,
      status: "draft",
      value: quote.totalValue,
      notes: quote.notes ?? quote.internalNotes ?? "",
    };

    addService(newOs);
    convertToAppointment(quote.id, newOsId);
    setDetailTarget(null);
    router.push(`/ordens-de-servico/nova?id=${newOsId}`);
  }

  const availableYears = useMemo(() => {
    const years = new Set(quotes.map((q) => q.createdAt.slice(0, 4)));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [quotes]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (search.trim())          n++;
    if (filterMonth !== "all")  n++;
    if (filterYear !== "all")   n++;
    if (filterCategory !== "all") n++;
    if (filterMinValue)         n++;
    if (filterMaxValue)         n++;
    return n;
  }, [search, filterMonth, filterYear, filterCategory, filterMinValue, filterMaxValue]);

  function clearFilters() {
    setSearch(""); setFilterMonth("all"); setFilterYear("all");
    setFilterCategory("all"); setFilterMinValue(""); setFilterMaxValue("");
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
  }, [quotes, tab, search, filterMonth, filterYear, filterCategory, filterMinValue, filterMaxValue, sort]);

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
      render: (row) => <span className="text-muted-foreground text-sm">{formatDate(row.createdAt.slice(0, 10))}</span>,
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
              <PopoverContent align="end" className="w-72 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Filtros avançados</p>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                      <X className="h-3 w-3" /> Limpar
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Mês</label>
                  <Select value={filterMonth} onValueChange={setFilterMonth}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Ano</label>
                  <Select value={filterYear} onValueChange={setFilterYear}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todos os anos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {availableYears.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="automotive">Automotivo</SelectItem>
                      <SelectItem value="architecture">Arquitetura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Faixa de valor (R$)</label>
                  <div className="flex gap-2 items-center">
                    <Input placeholder="Mín." value={filterMinValue} onChange={(e) => setFilterMinValue(e.target.value.replace(/[^\d,.]/g, ""))} className="h-8 text-sm" />
                    <span className="text-muted-foreground text-xs shrink-0">até</span>
                    <Input placeholder="Máx." value={filterMaxValue} onChange={(e) => setFilterMaxValue(e.target.value.replace(/[^\d,.]/g, ""))} className="h-8 text-sm" />
                  </div>
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
        onConvert={handleConvert}
        onStatusChange={(id, status) => updateStatus(id, status)}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) deleteQuote(deleteTarget.id); setDeleteTarget(null); }}
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


