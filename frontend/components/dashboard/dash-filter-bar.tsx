"use client";

import { format, startOfWeek, startOfMonth, subMonths, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DashPreset = "hoje" | "semana" | "mes" | "mes_anterior" | "custom";

export interface DashFilter {
  preset: DashPreset;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

function fmt(d: Date) { return format(d, "yyyy-MM-dd"); }

export function buildFilter(preset: DashPreset, from?: string, to?: string): DashFilter {
  const now = new Date();
  const today = fmt(now);
  switch (preset) {
    case "hoje":
      return { preset, from: today, to: today };
    case "semana":
      return { preset, from: fmt(startOfWeek(now, { weekStartsOn: 1 })), to: today };
    case "mes":
      return { preset, from: fmt(startOfMonth(now)), to: today };
    case "mes_anterior": {
      const prev = subMonths(now, 1);
      return { preset, from: fmt(startOfMonth(prev)), to: fmt(endOfMonth(prev)) };
    }
    case "custom":
      return { preset, from: from ?? fmt(startOfMonth(now)), to: to ?? today };
  }
}

const PRESETS: { key: DashPreset; label: string }[] = [
  { key: "hoje",         label: "Hoje" },
  { key: "semana",       label: "Semana" },
  { key: "mes",          label: "Este mês" },
  { key: "mes_anterior", label: "Mês anterior" },
  { key: "custom",       label: "Personalizado" },
];

interface Props {
  filter: DashFilter;
  onChange: (f: DashFilter) => void;
}

export function DashFilterBar({ filter, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map(({ key, label }) => (
        <Button
          key={key}
          size="sm"
          variant={filter.preset === key ? "default" : "outline"}
          className={cn("h-7 text-xs px-3", filter.preset !== key && "text-muted-foreground")}
          onClick={() => onChange(buildFilter(key, filter.from, filter.to))}
        >
          {label}
        </Button>
      ))}

      {filter.preset === "custom" && (
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={filter.from}
            onChange={(e) => onChange({ ...filter, from: e.target.value })}
            className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground"
          />
          <span className="text-xs text-muted-foreground">até</span>
          <input
            type="date"
            value={filter.to}
            min={filter.from}
            onChange={(e) => onChange({ ...filter, to: e.target.value })}
            className="h-7 text-xs rounded-md border border-border bg-background px-2 text-foreground"
          />
        </div>
      )}
    </div>
  );
}
