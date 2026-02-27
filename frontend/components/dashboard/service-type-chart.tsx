"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServicesStore } from "@/store/services-store";
import type { DashboardPeriod } from "@/components/dashboard/period-selector";

const COLORS = ["hsl(221,83%,53%)", "hsl(160,60%,45%)", "hsl(38,90%,55%)", "hsl(271,76%,53%)"];

function categorize(serviceType: string): string {
  const lower = serviceType.toLowerCase();
  if (
    lower.includes("residencial") ||
    lower.includes("solar") ||
    lower.includes("condom") ||
    lower.includes("ambiente")
  )
    return "Residencial";
  if (
    lower.includes("seguran") ||
    lower.includes("safety") ||
    lower.includes("corporativa") ||
    lower.includes("comercial")
  )
    return "Segurança / Comercial";
  return "Automotivo";
}

interface ServiceTypeChartProps {
  period: DashboardPeriod;
}

export function ServiceTypeChart({ period }: ServiceTypeChartProps) {
  const services = useServicesStore((s) => s.services);

  const data = useMemo(() => {
    const prefix = `${period.year}-${String(period.month + 1).padStart(2, "0")}`;
    const periodServices = services.filter((s) => s.date.startsWith(prefix));
    const counts: Record<string, number> = {};
    for (const s of periodServices) {
      const cat = categorize(s.serviceType);
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    const total = periodServices.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({ name, value: Math.round((count / total) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [services, period]);

  const displayData =
    data.length > 0
      ? data
      : [
          { name: "Automotivo", value: 68 },
          { name: "Residencial", value: 22 },
          { name: "Segurança / Comercial", value: 10 },
        ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Serviços por Tipo</CardTitle>
      </CardHeader>
      <CardContent className="pb-2 flex items-center justify-center">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={displayData}
              cx="50%"
              cy="45%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {displayData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val) => [`${val}%`, ""]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span style={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}>
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
