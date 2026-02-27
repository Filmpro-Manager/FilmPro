"use client";

import { useCompanyStore } from "@/store/company-store";
import { PeriodSelector, type DashboardPeriod } from "@/components/dashboard/period-selector";

interface DashboardHeaderProps {
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
}

export function DashboardHeader({ period, onPeriodChange }: DashboardHeaderProps) {
  const { settings } = useCompanyStore();
  const name = settings.tradeName || settings.name;

  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="space-y-0.5">
        <h1 className="text-xl font-semibold text-foreground">{name}</h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação</p>
      </div>
      <PeriodSelector period={period} onChange={onPeriodChange} />
    </div>
  );
}
