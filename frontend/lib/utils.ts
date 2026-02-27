import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentStatus, FilmType, TransactionType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date, pattern = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: ptBR });
}

export function formatDocument(doc: string): string {
  const digits = doc.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5"
    );
  }
  return doc;
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  const map: Record<AppointmentStatus, string> = {
    scheduled: "Agendado",
    in_progress: "Em Andamento",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };
  return map[status];
}

export function appointmentStatusColor(
  status: AppointmentStatus
): "blue" | "yellow" | "green" | "red" {
  const map: Record<AppointmentStatus, "blue" | "yellow" | "green" | "red"> = {
    scheduled: "blue",
    in_progress: "yellow",
    completed: "green",
    cancelled: "red",
  };
  return map[status];
}

export function filmTypeLabel(type: FilmType): string {
  const map: Record<FilmType, string> = {
    automotive: "Automotiva",
    residential: "Residencial",
    security: "Segurança",
    decorative: "Decorativa",
    solar: "Solar",
  };
  return map[type];
}

export function transactionTypeLabel(type: TransactionType): string {
  return type === "income" ? "Receita" : "Despesa";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");
}

export function isLowStock(available: number, minimum: number): boolean {
  return available <= minimum;
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
