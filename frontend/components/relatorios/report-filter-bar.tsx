"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReportFilter } from "./report-utils";
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { Employee, Client } from "@/types";

type Preset = "today" | "week" | "month" | "lastmonth" | "quarter" | "year" | "custom";

interface ReportFilterBarProps {
  filter: ReportFilter;
  onChange: (f: ReportFilter) => void;
  employees?: Employee[];
  clients?: Client[];
}

function toISO(d: Date) { return format(d, "yyyy-MM-dd"); }

const PRESETS: { key: Preset; label: string }[] = [
  { key: "today",     label: "Hoje" },
  { key: "week",      label: "Semana" },
  { key: "month",     label: "Este mês" },
  { key: "lastmonth", label: "Mês anterior" },
  { key: "quarter",   label: "Trimestre" },
  { key: "year",      label: "Este ano" },
];

function getPresetDates(key: Preset): { from: string; to: string } | null {
  const now = new Date();
  switch (key) {
    case "today":     return { from: toISO(now),                         to: toISO(now) };
    case "week":      return { from: toISO(subDays(now, 6)),             to: toISO(now) };
    case "month":     return { from: toISO(startOfMonth(now)),           to: toISO(endOfMonth(now)) };
    case "lastmonth": { const lm = subMonths(now, 1); return { from: toISO(startOfMonth(lm)), to: toISO(endOfMonth(lm)) }; }
    case "quarter":   return { from: toISO(subDays(now, 89)),            to: toISO(now) };
    case "year":      return { from: toISO(startOfYear(now)),            to: toISO(endOfYear(now)) };
    default:          return null;
  }
}

function activePreset(filter: ReportFilter): Preset | "custom" {
  for (const p of PRESETS) {
    const dates = getPresetDates(p.key);
    if (dates && dates.from === filter.from && dates.to === filter.to) return p.key;
  }
  return "custom";
}

export function ReportFilterBar({ filter, onChange, employees = [], clients = [] }: ReportFilterBarProps) {
  const current = activePreset(filter);

  function applyPreset(key: Preset) {
    const dates = getPresetDates(key);
    if (dates) onChange({ ...filter, ...dates });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={current === p.key ? "default" : "outline"}
            className="h-7 text-xs px-3"
            onClick={() => applyPreset(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-center gap-1 ml-1">
        <input
          type="date"
          value={filter.from}
          onChange={(e) => onChange({ ...filter, from: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
        <span className="text-xs text-muted-foreground">–</span>
        <input
          type="date"
          value={filter.to}
          onChange={(e) => onChange({ ...filter, to: e.target.value })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* Employee filter */}
      {employees.length > 0 && (
        <select
          value={filter.employeeId || ""}
          onChange={(e) => onChange({ ...filter, employeeId: e.target.value || undefined })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Todos os funcionários</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      )}

      {/* Client filter */}
      {clients.length > 0 && (
        <select
          value={filter.clientId || ""}
          onChange={(e) => onChange({ ...filter, clientId: e.target.value || undefined })}
          className="h-7 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
