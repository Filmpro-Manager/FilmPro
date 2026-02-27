"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface DashboardPeriod {
  year: number;
  month: number; // 0-indexed
}

interface PeriodSelectorProps {
  period: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
}

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  const [open, setOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(period.year);
  const now = new Date();
  const isCurrentMonth =
    period.year === now.getFullYear() && period.month === now.getMonth();

  function prev() {
    if (period.month === 0) {
      onChange({ year: period.year - 1, month: 11 });
    } else {
      onChange({ year: period.year, month: period.month - 1 });
    }
  }

  function next() {
    if (isCurrentMonth) return;
    if (period.month === 11) {
      onChange({ year: period.year + 1, month: 0 });
    } else {
      onChange({ year: period.year, month: period.month + 1 });
    }
  }

  function selectMonth(m: number) {
    onChange({ year: pickerYear, month: m });
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={prev}
        title="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setPickerYear(period.year);
        }}
      >
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-sm font-medium gap-1.5 min-w-[156px] justify-between"
          >
            <span>
              {MONTHS[period.month]} {period.year}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-60 p-3" align="end">
          {/* Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setPickerYear((y) => y - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-sm font-semibold">{pickerYear}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={pickerYear >= now.getFullYear()}
              onClick={() => setPickerYear((y) => y + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((name, i) => {
              const isFuture =
                pickerYear > now.getFullYear() ||
                (pickerYear === now.getFullYear() && i > now.getMonth());
              const isSelected = pickerYear === period.year && i === period.month;

              return (
                <Button
                  key={name}
                  variant={isSelected ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs rounded-lg",
                    isFuture && "opacity-30 pointer-events-none"
                  )}
                  disabled={isFuture}
                  onClick={() => selectMonth(i)}
                >
                  {name.slice(0, 3)}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button
        variant="ghost"
        size="icon"
        className={cn("h-8 w-8 rounded-lg", isCurrentMonth && "opacity-30 pointer-events-none")}
        disabled={isCurrentMonth}
        onClick={next}
        title="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
