import type { Transaction, Appointment } from "@/types";
import { formatCurrency } from "@/lib/utils";

// ─── CSV export ──────────────────────────────────────────────────────────────

function toCSV(rows: Record<string, string | number>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h] ?? "")).join(",")),
  ].join("\r\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const BOM = mimeType.includes("csv") ? "\uFEFF" : "";
  const blob = new Blob([BOM + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCSV(transactions: Transaction[], from: string, to: string) {
  const rows = transactions.map((t) => ({
    Data: t.date,
    Tipo: t.type === "income" ? "Receita" : "Despesa",
    Descrição: t.description,
    Categoria: t.category,
    Cliente: t.clientName || "",
    Valor: t.amount,
    Pago: t.isPaid ? "Sim" : "Não",
    "Método Pagamento": t.paymentMethod || "",
  }));
  downloadFile(toCSV(rows), `relatorio-financeiro-${from}-${to}.csv`, "text/csv;charset=utf-8;");
}

export function exportServicesCSV(services: Appointment[], from: string, to: string) {
  const rows = services.map((s) => ({
    Data: s.date,
    Cliente: s.clientName,
    Serviço: s.serviceType,
    Funcionário: s.employeeName,
    Status: s.status,
    Valor: s.value,
    "Custo Material": s.materialCost || 0,
    Retrabalho: s.isRework ? "Sim" : "Não",
    "Tempo (min)": s.actualMinutes || s.estimatedMinutes || 0,
  }));
  downloadFile(toCSV(rows), `relatorio-servicos-${from}-${to}.csv`, "text/csv;charset=utf-8;");
}

// ─── PDF export via jsPDF ────────────────────────────────────────────────────

type RGB = [number, number, number];
const NAVY: RGB  = [15,  23,  42];
const WHITE: RGB = [255, 255, 255];
const LIGHT: RGB = [248, 250, 252];
const MUTED: RGB = [100, 116, 139];
const DARK:  RGB  = [30,  41,  59];
const BORDER: RGB = [226, 232, 240];

export function exportReportPDF(params: {
  title: string;
  subtitle: string;
  companyName: string;
  kpis: { label: string; value: string }[];
  tableHeaders: string[];
  tableRows: string[][];
}) {
  import("jspdf").then((mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JsPDF = (mod.default ?? (mod as any).jsPDF ?? mod) as any;
    const doc = new JsPDF({ unit: "mm", format: "a4" });

    const PW = 210, ML = 16, MR = 16, CW = PW - ML - MR;
    let Y = 0;

    const f = (sz: number, wt: "normal" | "bold", col: RGB) => {
      doc.setFontSize(sz); doc.setFont("helvetica", wt);
      doc.setTextColor(col[0], col[1], col[2]);
    };
    const t = (s: string, x: number, y: number, align: "left" | "right" | "center" = "left") =>
      doc.text(String(s), x, y, align !== "left" ? { align } : {});
    const box = (x: number, y: number, w: number, h: number, fill: RGB) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      doc.setDrawColor(fill[0], fill[1], fill[2]);
      doc.rect(x, y, w, h, "F");
    };
    const np = (need: number) => { if (Y + need > 278) { doc.addPage(); Y = ML; } };

    // Header
    box(0, 0, PW, 28, NAVY);
    f(14, "bold", WHITE); t(params.companyName, ML, 11);
    f(8, "normal", [148, 163, 184]); t(params.title, ML, 17);
    f(7, "normal", [148, 163, 184]); t(params.subtitle, ML, 22);
    const dateStr = new Date().toLocaleDateString("pt-BR");
    f(7, "normal", [148, 163, 184]); t(`Gerado em ${dateStr}`, PW - MR, 22, "right");
    Y = 36;

    // KPIs
    if (params.kpis.length > 0) {
      const kpiW = Math.min(CW / params.kpis.length, 50);
      params.kpis.forEach((kpi, i) => {
        const kx = ML + i * kpiW;
        box(kx, Y, kpiW - 2, 18, LIGHT);
        f(7, "normal", MUTED); t(kpi.label, kx + 3, Y + 5);
        f(10, "bold", DARK);   t(kpi.value, kx + 3, Y + 13);
      });
      Y += 24;
    }

    // Table
    if (params.tableHeaders.length > 0 && params.tableRows.length > 0) {
      const colW = CW / params.tableHeaders.length;
      const TH = 7;
      box(ML, Y, CW, TH, NAVY);
      f(7, "bold", WHITE);
      params.tableHeaders.forEach((h, i) => {
        t(h, ML + i * colW + 3, Y + 5);
      });
      Y += TH;

      params.tableRows.forEach((row, ri) => {
        np(TH + 1);
        box(ML, Y, CW, TH, ri % 2 === 0 ? WHITE : LIGHT);
        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]); doc.setLineWidth(0.2);
        doc.line(ML, Y + TH, ML + CW, Y + TH);
        f(7.5, "normal", DARK);
        row.forEach((cell, ci) => {
          const lines = doc.splitTextToSize(cell, colW - 6);
          t(lines[0], ML + ci * colW + 3, Y + 5);
        });
        Y += TH;
      });
    }

    // Footer
    const pages = (doc.internal as { getNumberOfPages: () => number }).getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      f(7, "normal", MUTED);
      t(`${params.companyName} · Relatório Gerencial`, ML, 292);
      t(`Pág. ${i}/${pages}`, PW - MR, 292, "right");
    }

    doc.save(`${params.title.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  });
}
