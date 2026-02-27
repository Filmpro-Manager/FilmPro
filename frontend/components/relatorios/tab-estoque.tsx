"use client";

import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportKpiCard } from "./report-kpi-card";
import { computeEstoque } from "./report-utils";
import { formatCurrency } from "@/lib/utils";
import { Package, AlertTriangle, TrendingDown, DollarSign } from "lucide-react";
import type { Product, Appointment } from "@/types";
import type { ReportFilter } from "./report-utils";

const C1 = "hsl(var(--chart-1, 142 76% 36%))";
const C2 = "hsl(var(--chart-2, 0 72% 51%))";

interface TabEstoqueProps {
  products: Product[];
  services: Appointment[];
  filter: ReportFilter;
}

export function TabEstoque({ products, services, filter }: TabEstoqueProps) {
  const data = useMemo(() => computeEstoque(products, services, filter), [products, services, filter]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ReportKpiCard label="Total de Produtos" value={String(data.totalProducts)}              icon={Package}       />
        <ReportKpiCard label="Abaixo do Mínimo"  value={String(data.belowMin)}                  icon={AlertTriangle}  valueColor={data.belowMin > 0 ? "red" : "green"} />
        <ReportKpiCard label="Custo/Material Svc" value={formatCurrency(data.avgMaterialCost)}   icon={DollarSign}     valueColor="blue" />
        <ReportKpiCard label="Impacto na Margem"  value={`${data.marginImpact.toFixed(1)}%`}     icon={TrendingDown}
          valueColor={data.marginImpact > 25 ? "red" : data.marginImpact > 10 ? "yellow" : "green"}
          sub="custo mat. / receita" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <ReportKpiCard label="Valor Total em Estoque" value={formatCurrency(data.totalStock)}    icon={Package} />
        <ReportKpiCard label="Custo Consumo Período"  value={formatCurrency(data.totalConsumo)}  icon={DollarSign} valueColor="red" />
        <ReportKpiCard label="Giro de Estoque"        value={`${data.giro.toFixed(2)}×`}         icon={TrendingDown}
          sub="consumo / estoque médio" valueColor={data.giro > 1 ? "green" : data.giro > 0.5 ? "yellow" : "red"} />
      </div>

      {/* Produtos abaixo do mínimo */}
      {data.belowMinList.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Produtos Abaixo do Estoque Mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.belowMinList.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{p.brand} {p.model}</p>
                    <p className="text-xs text-muted-foreground">SKU: {p.sku || "—"}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="text-xs">{p.availableMeters}m disponível</Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">mín: {p.minimumStock}m</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Consumo por produto */}
        {data.consumo.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Consumo por Material</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.consumo.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}m`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined, name) => name === "cost" ? formatCurrency(v ?? 0) : `${v ?? 0}m`} />
                  <Bar dataKey="consumed" name="Consumo (m)" fill={C1} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Custo por tipo de serviço */}
        {data.consumoByType.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Custo de Material por Tipo de Serviço</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.consumoByType.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                  <Bar dataKey="cost" name="Custo (R$)" fill={C2} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estoque atual */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Estoque Atual — Todos os Produtos</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Produto</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Disponível</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Mínimo</th>
                  <th className="text-right py-2 pr-4 font-medium text-muted-foreground">Custo/m</th>
                  <th className="text-right py-2 font-medium text-muted-foreground">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-2 pr-4">
                      <p className="font-medium">{p.brand} {p.model}</p>
                      <p className="text-xs text-muted-foreground">{p.sku || "—"}</p>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <span className={p.availableMeters < p.minimumStock ? "text-destructive font-medium" : ""}>
                        {p.availableMeters}m
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right text-muted-foreground">{p.minimumStock}m</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(p.costPrice)}</td>
                    <td className="py-2 text-right font-medium">{formatCurrency(p.availableMeters * p.costPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
