"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Car,
  Building2,
  X,
  Phone,
  Mail,
  MapPin,
  Check,
  AlertCircle,
} from "lucide-react";
import type {
  Quote,
  QuoteItem,
  QuoteItemType,
  QuoteDiscountType,
  QuoteCategory,
} from "@/types";
import { useQuotesStore } from "@/store/quotes-store";
import { useClientsStore } from "@/store/clients-store";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useProductsStore } from "@/store/products-store";
import { useAuthStore } from "@/store/auth-store";
import { maskCurrency, parseCurrency } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  apiCreateQuote,
  apiUpdateQuote,
  type CreateQuoteData,
  type ApiQuote,
} from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
function calcItemTotal(item: QuoteItem): number {
  const gross = item.unitPrice * item.quantity;
  const disc =
    item.discountType === "percent"
      ? gross * (item.discount / 100)
      : item.discount;
  return Math.max(0, gross - disc);
}
function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h > 0 ? `${h}h` : "", m > 0 ? `${m}min` : ""].filter(Boolean).join(" ");
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  "Dinheiro",
  "PIX",
  "Cartão de Crédito",
  "Cartão de Débito",
  "Boleto",
  "Transferência",
];

const FILM_TYPE_LABELS: Record<string, string> = {
  automotive: "Automotiva",
  architecture: "Arquitetônica",
  security: "Segurança",
  decorative: "Decorativa",
  solar: "Solar",
};

const CATEGORY_OPTIONS: {
  value: QuoteCategory;
  label: string;
  icon: React.ElementType;
  activeClass: string;
}[] = [
  {
    value: "automotive",
    label: "Automotivo",
    icon: Car,
    activeClass:
      "border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
  },
  {
    value: "architecture",
    label: "Arquitetura",
    icon: Building2,
    activeClass:
      "border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300",
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface QuoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuote?: Quote;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function QuoteFormDialog({
  open,
  onOpenChange,
  initialQuote,
}: QuoteFormDialogProps) {
  const { addQuote, updateQuote } = useQuotesStore();
  const { clients } = useClientsStore();
  const { services: catalogServices } = useServiceCatalogStore();
  const { products } = useProductsStore();
  const { token } = useAuthStore();
  const [submitting, setSubmitting] = useState(false);

  const isEditing = !!initialQuote;

  // ─── Form state ─────────────────────────────────────────────────────────
  const [quoteCategory, setQuoteCategory] = useState<QuoteCategory>("automotive");
  const [clientId, setClientId] = useState("");

  // Service preview
  const [previewServiceId, setPreviewServiceId] = useState("");

  // Product/film preview
  const [previewProductId, setPreviewProductId] = useState("");
  const [productMeters, setProductMeters] = useState("");

  // Items
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [priceDisplays, setPriceDisplays] = useState<Record<string, string>>({});
  const [discountDisplays, setDiscountDisplays] = useState<Record<string, string>>({});

  // Totals
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<QuoteDiscountType>("value");

  // Payment methods (multi toggle, none pre-selected)
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>([]);
  const [paymentNotes, setPaymentNotes] = useState("");

  // Notes
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Derived ────────────────────────────────────────────────────────────
  const selectedClient = clients.find((c) => c.id === clientId) ?? null;

  const filteredServices = catalogServices.filter((s) => {
    if (!s.isActive) return false;
    if (quoteCategory === "automotive") return s.category === "automotive";
    return s.category === "architecture";
  });

  const previewService =
    catalogServices.find((s) => s.id === previewServiceId) ?? null;

  const previewProduct =
    products.find((p) => p.id === previewProductId) ?? null;

  const metersNum = parseFloat(productMeters.replace(",", ".")) || 0;
  const productPreviewTotal = previewProduct
    ? previewProduct.pricePerMeter * metersNum
    : 0;

  // ─── Init ────────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setQuoteCategory("automotive");
    setClientId("");
    setPreviewServiceId("");
    setPreviewProductId("");
    setProductMeters("");
    setItems([]);
    setPriceDisplays({});
    setDiscountDisplays({});
    setDiscountValue("");
    setDiscountType("value");
    setAcceptedPaymentMethods([]);
    setPaymentNotes("");
    setNotes("");
    setInternalNotes("");
    setErrors({});
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialQuote) {
      const cat =
        (initialQuote as Quote & { category?: QuoteCategory }).category ??
        "automotive";
      setQuoteCategory(cat);
      setClientId(initialQuote.clientId);
      const loadedItems = initialQuote.items.length ? initialQuote.items : [];
      setItems(loadedItems);
      const newPrices: Record<string, string> = {};
      const newDiscs: Record<string, string> = {};
      loadedItems.forEach((it) => {
        newPrices[it.id] =
          it.unitPrice > 0
            ? maskCurrency(String(Math.round(it.unitPrice * 100)))
            : "";
        newDiscs[it.id] =
          it.discount > 0
            ? it.discountType === "percent"
              ? String(it.discount)
              : maskCurrency(String(Math.round(it.discount * 100)))
            : "";
      });
      setPriceDisplays(newPrices);
      setDiscountDisplays(newDiscs);
      setDiscountValue(
        initialQuote.discount > 0
          ? initialQuote.discountType === "percent"
            ? String(initialQuote.discount)
            : maskCurrency(String(Math.round(initialQuote.discount * 100)))
          : ""
      );
      setDiscountType(initialQuote.discountType ?? "value");
      setAcceptedPaymentMethods(
        (initialQuote as unknown as { acceptedPaymentMethods?: string[] })
          .acceptedPaymentMethods ?? []
      );
      setPaymentNotes(initialQuote.payment?.notes ?? "");
      setNotes(initialQuote.notes ?? "");
      setInternalNotes(initialQuote.internalNotes ?? "");
    } else {
      resetForm();
    }
    setPreviewServiceId("");
    setPreviewProductId("");
    setProductMeters("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuote]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  function handleAddService(serviceId: string) {
    const service = catalogServices.find((s) => s.id === serviceId);
    if (!service) return;
    if (items.some((it) => it.type === "service" && it.serviceId === service.id)) {
      toast.warning("Este serviço já foi adicionado ao orçamento");
      return;
    }
    addItemToList({
      id: crypto.randomUUID(),
      type: "service" as QuoteItemType,
      name: service.name,
      description: service.description,
      quantity: 1,
      unit: "un",
      unitPrice: service.price,
      discount: 0,
      discountType: "value" as QuoteDiscountType,
      total: service.price,
      serviceId: service.id,
    });
    setPreviewServiceId("");
    setErrors((prev) => { const e = { ...prev }; delete e.itemsService; return e; });
  }

  function handleAddProduct() {
    if (!previewProduct || metersNum <= 0) return;
    if (metersNum > previewProduct.availableMeters) {
      toast.warning(
        `Estoque insuficiente — disponível: ${previewProduct.availableMeters} m². O item foi adicionado mesmo assim.`
      );
    }
    const total = previewProduct.pricePerMeter * metersNum;
    addItemToList({
      id: crypto.randomUUID(),
      type: "product" as QuoteItemType,
      name: `${previewProduct.brand} ${previewProduct.model}`,
      description: `${previewProduct.transparency}% transparência — ${
        FILM_TYPE_LABELS[previewProduct.type] ?? previewProduct.type
      }`,
      quantity: metersNum,
      unit: "m²",
      unitPrice: previewProduct.pricePerMeter,
      discount: 0,
      discountType: "value" as QuoteDiscountType,
      total,
      productId: previewProduct.id,
    });
    setPreviewProductId("");
    setProductMeters("");
    setErrors((prev) => { const e = { ...prev }; delete e.itemsProduct; return e; });
  }

  function addItemToList(item: QuoteItem) {
    setItems((p) => [...p, item]);
    setPriceDisplays((p) => ({
      ...p,
      [item.id]:
        item.unitPrice > 0
          ? maskCurrency(String(Math.round(item.unitPrice * 100)))
          : "",
    }));
    setDiscountDisplays((p) => ({ ...p, [item.id]: "" }));
  }

  function updateItem<K extends keyof QuoteItem>(
    id: string,
    key: K,
    val: QuoteItem[K]
  ) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, [key]: val };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  }

  function updateItemPrice(id: string, masked: string) {
    const val = parseCurrency(masked);
    setPriceDisplays((p) => ({ ...p, [id]: masked }));
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, unitPrice: val };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  }

  function updateItemDiscount(id: string, masked: string) {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    let val =
      item.discountType === "percent"
        ? parseFloat(masked.replace(",", ".")) || 0
        : parseCurrency(masked);
    // Limita desconto em % a no máximo 100
    if (item.discountType === "percent" && val > 100) {
      val = 100;
      masked = "100";
    }
    // Limita desconto em R$ ao valor bruto do item
    if (item.discountType === "value") {
      const gross = item.unitPrice * item.quantity;
      if (val > gross) {
        val = gross;
        masked = maskCurrency(String(Math.round(gross * 100)));
      }
    }
    setDiscountDisplays((p) => ({ ...p, [id]: masked }));
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const updated = { ...it, discount: val };
        updated.total = calcItemTotal(updated);
        return updated;
      })
    );
  }

  function removeItemRow(id: string) {
    setItems((p) => p.filter((it) => it.id !== id));
    setPriceDisplays((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
    setDiscountDisplays((p) => {
      const n = { ...p };
      delete n[id];
      return n;
    });
  }

  function togglePaymentMethod(method: string) {
    setAcceptedPaymentMethods((prev) => {
      const next = prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method];
      if (next.length > 0)
        setErrors((e) => { const r = { ...e }; delete r.payment; return r; });
      return next;
    });
  }

  // ─── Totals ──────────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => sum + calcItemTotal(item), 0);
  const rawDiscount = discountValue
    ? discountType === "percent"
      ? parseFloat(discountValue.replace(",", "."))
      : parseCurrency(discountValue)
    : 0;
  const discountAmount =
    discountType === "percent" ? subtotal * (rawDiscount / 100) : rawDiscount;
  const totalValue = Math.max(0, subtotal - discountAmount);

  // ─── Validation & Submit ──────────────────────────────────────────────────
  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!clientId) errs.clientId = "Selecione um cliente";
    if (!items.some((it) => it.type === "service"))
      errs.itemsService = "Adicione ao menos um serviço";
    const productItems = items.filter((it) => it.type === "product");
    if (productItems.length === 0)
      errs.itemsProduct = "Adicione ao menos uma película";
    else if (productItems.every((it) => it.quantity <= 0))
      errs.itemsProduct = "Informe a metragem da película";
    if (acceptedPaymentMethods.length === 0)
      errs.payment = "Selecione ao menos uma forma de pagamento";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (!token) { toast.error("Sessão expirada, faça login novamente"); return; }
    if (submitting) return;

    const client = clients.find((c) => c.id === clientId);
    const clientName = client?.name ?? "";
    const clientPhone = (client as unknown as { phone?: string })?.phone ?? "";
    const clientEmail = client?.email ?? "";

    let subjectData: CreateQuoteData["subject"] = undefined;
    if (quoteCategory === "automotive" && client?.vehicle) {
      const v = client.vehicle;
      subjectData = {
        type: "vehicle",
        brand: v.brand,
        model: v.model,
        year: v.year ? String(v.year) : undefined,
        plate: v.plate,
        color: v.color,
      };
    }

    const payload: CreateQuoteData = {
      clientId: clientId || undefined,
      clientName,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      category: quoteCategory,
      subject: subjectData,
      items: items.map((it) => ({
        type: it.type,
        name: it.name,
        description: it.description,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discount: it.discount,
        discountType: it.discountType,
        total: calcItemTotal(it),
        productId: it.productId,
        serviceId: it.serviceId,
        vehicleId: it.vehicleId,
      })),
      subtotal,
      discount: rawDiscount,
      discountType: rawDiscount > 0 ? discountType : undefined,
      totalValue,
      acceptedPaymentMethods,
      payment: paymentNotes ? { method: "", installments: 1, notes: paymentNotes } : undefined,
      notes: notes || undefined,
      internalNotes: internalNotes || undefined,
      issueDate: todayStr(),
      validUntil: undefined,
    };

    setSubmitting(true);
    try {
      let result: ApiQuote;
      if (isEditing) {
        result = await apiUpdateQuote(initialQuote!.id, payload, token);
        updateQuote(mapApiToQuote(result));
        toast.success("Orçamento atualizado com sucesso!");
      } else {
        result = await apiCreateQuote(payload, token);
        addQuote(mapApiToQuote(result));
        toast.success("Orçamento criado com sucesso!");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar orçamento");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── API → Quote mapper (local helper) ───────────────────────────────────
  function mapApiToQuote(api: ApiQuote): Quote {
    return {
      id: api.id,
      number: api.number,
      issueDate: api.issueDate.slice(0, 10),
      validUntil: api.validUntil ? api.validUntil.slice(0, 10) : "",
      status: api.status as Quote["status"],
      clientId: api.clientId ?? "",
      clientName: api.clientName,
      clientPhone: api.clientPhone ?? undefined,
      clientEmail: api.clientEmail ?? undefined,
      clientDocument: api.clientDocument ?? undefined,
      clientDocumentType: (api.clientDocumentType as "cpf" | "cnpj" | undefined) ?? undefined,
      category: api.category as Quote["category"],
      subject: api.subject as Quote["subject"],
      sellerId: api.sellerId ?? undefined,
      sellerName: api.sellerName ?? undefined,
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
      payment: api.payment as Quote["payment"],
      notes: api.notes ?? undefined,
      internalNotes: api.internalNotes ?? undefined,
      convertedAt: api.convertedAt ?? undefined,
      convertedToAppointmentId: api.convertedToAppointmentId ?? undefined,
      createdAt: api.createdAt,
      updatedAt: api.updatedAt,
    };
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-w-3xl w-[calc(100%-2rem)] sm:w-full h-[90vh] p-0 gap-0 rounded-2xl overflow-hidden [&>button:last-of-type]:hidden">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {isEditing ? "Editar Orçamento" : "Novo Orçamento"}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-6 space-y-8">

            {/* ── 1. Tipo ── */}
            <section>
              <SectionTitle>Tipo de Orçamento</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORY_OPTIONS.map(({ value, label, icon: Icon, activeClass }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuoteCategory(value)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all text-sm font-medium",
                      quoteCategory === value
                        ? activeClass
                        : "border-border hover:border-muted-foreground/40 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <Separator />

            {/* ── 2. Cliente ── */}
            <section>
              <SectionTitle>Cliente</SectionTitle>
              <div>
                <Label>Selecionar cliente *</Label>
                <Select value={clientId} onValueChange={(v) => { setClientId(v); setErrors((e) => { const r = { ...e }; delete r.clientId; return r; }); }}>
                  <SelectTrigger
                    className={cn(errors.clientId && "border-destructive")}
                  >
                    <SelectValue placeholder="Selecione um cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum cliente cadastrado
                      </div>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.clientId}
                  </p>
                )}
              </div>

              {/* Client info card (read-only) */}
              {selectedClient && (
                <div className="mt-3 rounded-xl border bg-muted/20 p-4 space-y-3">
                  {/* Avatar + name */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 font-bold text-primary text-sm">
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">
                        {selectedClient.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Cliente cadastrado
                      </p>
                    </div>
                  </div>

                  {/* Contact & address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm text-muted-foreground">
                    {(selectedClient as unknown as { phone?: string }).phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {(selectedClient as unknown as { phone?: string }).phone}
                        </span>
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        <span>{selectedClient.email}</span>
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          {selectedClient.address.street},{" "}
                          {selectedClient.address.number}
                          {selectedClient.address.complement
                            ? ` - ${selectedClient.address.complement}`
                            : ""}
                          {" — "}
                          {selectedClient.address.neighborhood},{" "}
                          {selectedClient.address.city}/
                          {selectedClient.address.state}
                          {selectedClient.address.zipCode
                            ? ` — CEP ${selectedClient.address.zipCode}`
                            : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Vehicle (automotive only) */}
                  {quoteCategory === "automotive" && selectedClient.vehicle && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5" /> Veículo
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          selectedClient.vehicle.brand,
                          selectedClient.vehicle.model,
                          selectedClient.vehicle.year
                            ? String(selectedClient.vehicle.year)
                            : undefined,
                          selectedClient.vehicle.color,
                        ]
                          .filter(Boolean)
                          .map((v, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-xs"
                            >
                              {v}
                            </Badge>
                          ))}
                        {selectedClient.vehicle.plate && (
                          <Badge
                            variant="outline"
                            className="text-xs font-mono tracking-widest"
                          >
                            {selectedClient.vehicle.plate}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            <Separator />

            {/* ── 4. Serviços ── */}
            <section>
              <SectionTitle>Serviços</SectionTitle>
              <div>
                <Label className="text-xs mb-1.5 block">
                  Selecionar do catálogo
                </Label>
                <Select
                  value={previewServiceId}
                  onValueChange={(id) => handleAddService(id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um serviço..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredServices.length === 0 ? (
                      <SelectItem value="__empty__" disabled>
                        Nenhum serviço disponível para este tipo
                      </SelectItem>
                    ) : (
                      filteredServices.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>


            </section>

            <Separator />

            {/* ── 5. Películas ── */}
            <section>
              <SectionTitle>Películas</SectionTitle>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs mb-1.5 block">
                    Selecionar película do estoque
                  </Label>
                  <Select
                    value={previewProductId}
                    onValueChange={setPreviewProductId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Escolha uma película..." />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length === 0 ? (
                        <SelectItem value="__empty__" disabled>
                          Nenhum produto cadastrado
                        </SelectItem>
                      ) : (
                        products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.brand} {p.model} ({p.transparency}%)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-36">
                  <Label className="text-xs mb-1.5 block">
                    Metros a utilizar (m²)
                  </Label>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.1}
                    value={productMeters}
                    onChange={(e) => setProductMeters(e.target.value)}
                    className="h-10"
                    placeholder="1"
                  />
                </div>
              </div>

              {/* Film preview card */}
              {previewProduct && (
                <div className="mt-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">
                          {previewProduct.brand} {previewProduct.model}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {FILM_TYPE_LABELS[previewProduct.type] ??
                            previewProduct.type}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <InfoStat
                          label="Transparência"
                          value={`${previewProduct.transparency}%`}
                        />
                        <InfoStat
                          label="Preço / m²"
                          value={maskCurrency(
                            String(
                              Math.round(previewProduct.pricePerMeter * 100)
                            )
                          )}
                        />
                        <InfoStat
                          label="Em estoque"
                          value={`${previewProduct.availableMeters} m²`}
                          warn={
                            metersNum > 0 &&
                            previewProduct.availableMeters < metersNum
                          }
                        />
                        <InfoStat
                          label={`Total (${metersNum} m²)`}
                          value={maskCurrency(
                            String(Math.round(productPreviewTotal * 100))
                          )}
                          highlight
                        />
                      </div>
                      {previewProduct.supplier && (
                        <p className="text-xs text-muted-foreground">
                          Fornecedor: {previewProduct.supplier}
                        </p>
                      )}
                      {metersNum > 0 &&
                        previewProduct.availableMeters < metersNum && (
                          <p className="text-xs text-destructive font-medium">
                            ⚠ Estoque insuficiente — disponível:{" "}
                            {previewProduct.availableMeters} m²
                          </p>
                        )}
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddProduct}
                      disabled={metersNum <= 0}
                      className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <Separator />

            {/* ── 6. Itens adicionados ── */}
            <section>
              <SectionTitle>Itens do Orçamento</SectionTitle>
              {(errors.itemsService || errors.itemsProduct) && (
                <div className="space-y-1.5 mb-3">
                  {errors.itemsService && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errors.itemsService}
                    </div>
                  )}
                  {errors.itemsProduct && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      {errors.itemsProduct}
                    </div>
                  )}
                </div>
              )}
              {items.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Nenhum item adicionado. Selecione um serviço ou película acima.
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-card p-3 space-y-3"
                    >
                      {/* Row 1: badge + name + remove */}
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs shrink-0",
                            item.type === "service"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300/40"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300/40"
                          )}
                        >
                          {item.type === "service" ? "Serviço" : "Película"}
                        </Badge>
                        <span className="text-sm font-medium flex-1 leading-tight">
                          {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItemRow(item.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0 p-1 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {item.description && (
                        <p className="text-xs text-muted-foreground pl-1 -mt-1">
                          {item.description}
                        </p>
                      )}

                      {/* Row 2: qty, unit, price, discount, total */}
                      <div className="grid grid-cols-12 gap-2 items-end">
                        {item.type !== "service" && (
                          <div className="col-span-2">
                            <Label className="text-xs">Qtd</Label>
                            <Input
                              className="h-8 text-sm text-center"
                              type="number"
                              min={0.01}
                              step={item.unit === "m²" ? 0.1 : 1}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "quantity",
                                  parseFloat(e.target.value) || 1
                                )
                              }
                            />
                          </div>
                        )}
                        {item.type !== "service" && (
                          <div className="col-span-2">
                            <Label className="text-xs">Unid.</Label>
                            <Select
                              value={item.unit}
                              onValueChange={(v) => updateItem(item.id, "unit", v)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">un</SelectItem>
                                <SelectItem value="m²">m²</SelectItem>
                                <SelectItem value="m">m</SelectItem>
                                <SelectItem value="h">h</SelectItem>
                                <SelectItem value="cx">cx</SelectItem>
                                <SelectItem value="kg">kg</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className={item.type === "service" ? "col-span-4" : "col-span-3"}>
                          <Label className="text-xs">
                            {item.unit === "m²" ? "Preço/m²" : "Preço unit."}
                          </Label>
                          <Input
                            className="h-8 text-sm text-right"
                            value={priceDisplays[item.id] ?? ""}
                            onChange={(e) =>
                              updateItemPrice(
                                item.id,
                                maskCurrency(e.target.value.replace(/\D/g, ""))
                              )
                            }
                            placeholder="R$ 0,00"
                          />
                        </div>
                        <div className={item.type === "service" ? "col-span-4" : "col-span-3"}>
                          <Label className="text-xs">Desconto</Label>
                          <div className="flex gap-1">
                            <Select
                              value={item.discountType}
                              onValueChange={(v) =>
                                updateItem(
                                  item.id,
                                  "discountType",
                                  v as QuoteDiscountType
                                )
                              }
                            >
                              <SelectTrigger className="h-8 w-14 text-xs px-2">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="value">R$</SelectItem>
                                <SelectItem value="percent">%</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              className="h-8 text-sm text-right flex-1"
                              value={discountDisplays[item.id] ?? ""}
                              onChange={(e) => {
                                const raw = e.target.value;
                                updateItemDiscount(
                                  item.id,
                                  item.discountType === "percent"
                                    ? raw.replace(/[^\d.,]/g, "")
                                    : maskCurrency(raw.replace(/\D/g, ""))
                                );
                              }}
                              placeholder={
                                item.discountType === "percent"
                                  ? "0"
                                  : "R$ 0,00"
                              }
                            />
                          </div>
                        </div>
                        <div className={`${item.type === "service" ? "col-span-4" : "col-span-2"} text-right`}>
                          <Label className="text-xs text-muted-foreground">
                            Total
                          </Label>
                          <p className="text-sm font-bold text-primary mt-1">
                            {maskCurrency(
                              String(Math.round(calcItemTotal(item) * 100))
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <Separator />

            {/* ── 7. Totais ── */}
            <section>
              <SectionTitle>Totais</SectionTitle>
              <div>
                <div className="w-full">
                  {/* Linhas de valores */}
                  <div className="rounded-xl border bg-muted/20 divide-y overflow-hidden mb-3">
                    <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium tabular-nums">
                        {maskCurrency(String(Math.round(subtotal * 100)))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2.5">
                      <span className="text-sm text-muted-foreground flex-1">Desconto</span>
                      <Select
                        value={discountType}
                        onValueChange={(v) => setDiscountType(v as QuoteDiscountType)}
                      >
                        <SelectTrigger className="h-7 w-14 text-xs px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="value">R$</SelectItem>
                          <SelectItem value="percent">%</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-7 w-28 text-sm text-right tabular-nums"
                        value={discountValue}
                        onChange={(e) => {
                            if (discountType === "percent") {
                              const raw = e.target.value.replace(/[^\d.,]/g, "");
                              const num = parseFloat(raw.replace(",", "."));
                              setDiscountValue(!isNaN(num) && num > 100 ? "100" : raw);
                            } else {
                              const raw = maskCurrency(e.target.value.replace(/\D/g, ""));
                              const num = parseCurrency(raw);
                              // Limita ao subtotal atual
                              setDiscountValue(num > subtotal ? maskCurrency(String(Math.round(subtotal * 100))) : raw);
                            }
                          }}
                        placeholder={discountType === "percent" ? "0%" : "R$ 0,00"}
                      />
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center px-4 py-2.5 text-sm">
                        <span className="text-muted-foreground">(-) Desconto aplicado</span>
                        <span className="text-destructive font-medium tabular-nums">
                          -{maskCurrency(String(Math.round(discountAmount * 100)))}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Total destacado */}
                  <div className="rounded-xl bg-slate-900 dark:bg-slate-800 text-white px-5 py-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</span>
                    <span className="text-2xl font-bold tabular-nums">
                      {maskCurrency(String(Math.round(totalValue * 100)))}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* ── 8. Formas de Pagamento ── */}
            <section>
              <SectionTitle>Formas de Pagamento Aceitas</SectionTitle>
              <p className="text-xs text-muted-foreground -mt-2 mb-3">
                Marque as formas disponíveis para este orçamento. Nada é
                pré-selecionado.
              </p>
              {errors.payment && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 mb-3 text-xs font-medium text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errors.payment}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const active = acceptedPaymentMethods.includes(method);
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => togglePaymentMethod(method)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-all text-left",
                        active
                          ? "border-primary bg-primary/5 text-foreground font-medium"
                          : "border-border text-muted-foreground hover:border-muted-foreground/50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                          active
                            ? "border-primary bg-primary"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {active && (
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        )}
                      </div>
                      {method}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <Label className="text-xs">Observações de pagamento</Label>
                <Input
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Ex.: Boleto com vencimento em 30 dias..."
                  className="mt-1"
                />
              </div>
            </section>

            <Separator />

            {/* ── 9. Observações ── */}
            <section>
              <SectionTitle>Observações</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Para o cliente</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informações que aparecerão no orçamento..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>
                    Notas internas{" "}
                    <span className="text-muted-foreground text-xs">
                      (não aparece no orçamento)
                    </span>
                  </Label>
                  <Textarea
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Anotações para uso interno..."
                    rows={3}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-background shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-xl font-bold text-primary">
              {maskCurrency(String(Math.round(totalValue * 100)))}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar Orçamento"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
      {children}
    </h3>
  );
}

function InfoStat({
  label,
  value,
  warn,
  highlight,
}: {
  label: string;
  value: string;
  warn?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          warn
            ? "text-destructive"
            : highlight
            ? "text-primary"
            : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
