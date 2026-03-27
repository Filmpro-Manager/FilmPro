// Módulo removido
export {};

import { formatCurrency } from "@/lib/utils";

type RGB = [number, number, number];
const NAVY:   RGB = [15,  23,  42];
const DARK:   RGB = [30,  41,  59];
const BODY:   RGB = [71,  85, 105];
const MUTED:  RGB = [100, 116, 139];
const GHOST:  RGB = [148, 163, 184];
const LIGHT:  RGB = [248, 250, 252];
const BORDER: RGB = [226, 232, 240];
const WHITE:  RGB = [255, 255, 255];
const GREEN:  RGB = [21,  128,  61];
const AMBER:  RGB = [161,  98,   7];
const RED:    RGB = [185,  28,  28];

function fmtDate(d?: string): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function loadLogo(url: string): Promise<{ data: string; w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width  = img.naturalWidth  || 400;
        cv.height = img.naturalHeight || 200;
        cv.getContext("2d")?.drawImage(img, 0, 0);
        resolve({ data: cv.toDataURL("image/png"), w: cv.width, h: cv.height });
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

const statusLabel: Record<string, string> = {
  issued:    "EMITIDA",
  paid:      "PAGA",
  pending:   "PENDENTE",
  cancelled: "CANCELADA",
};
const statusColor: Record<string, RGB> = {
  issued:    GREEN,
  paid:      GREEN,
  pending:   AMBER,
  cancelled: RED,
};

export function generateInvoicePDF(
  invoice: Invoice,
  company: CompanySettings,
  client?: Client,
): void {
  import("jspdf").then(async (mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JsPDF = (mod.default ?? (mod as any).jsPDF ?? mod) as any;
    const doc   = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const logo = company.logoUrl ? await loadLogo(company.logoUrl) : null;

    const PW = 210;
    const ML = 16;
    const MR = 16;
    const CW = PW - ML - MR;
    const RX = PW - MR;
    let   Y  = 0;

    // ── primitivas ──────────────────────────────────────────────────────────
    const f = (sz: number, wt: "normal" | "bold", col: RGB) => {
      doc.setFontSize(sz);
      doc.setFont("helvetica", wt);
      doc.setTextColor(col[0], col[1], col[2]);
    };
    const t = (s: string, x: number, y: number, align: "left" | "right" | "center" = "left") =>
      doc.text(String(s), x, y, align !== "left" ? { align } : {});
    const box = (x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      if (stroke) {
        doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
        doc.setLineWidth(0.25);
        doc.rect(x, y, w, h, "FD");
      } else {
        doc.setDrawColor(fill[0], fill[1], fill[2]);
        doc.rect(x, y, w, h, "F");
      }
    };
    const hl = (y: number, col: RGB, lw: number, x1 = ML, x2 = RX) => {
      doc.setDrawColor(col[0], col[1], col[2]);
      doc.setLineWidth(lw);
      doc.line(x1, y, x2, y);
    };
    const np = (need: number) => {
      if (Y + need > 281) { doc.addPage(); Y = ML; }
    };

    // ══════════════════════════════════════════════════════════════════════
    // 1. CABEÇALHO
    // ══════════════════════════════════════════════════════════════════════

    const LW = 28, LH = 10;
    let logoW = 0, logoH = 0;
    if (logo) {
      const r = logo.w / logo.h;
      logoW = LW; logoH = LW / r;
      if (logoH > LH) { logoH = LH; logoW = LH * r; }
    }

    type L = { s: string; sz: number; bold: boolean; col: RGB; gap: number };
    const left: L[] = [];
    left.push({ s: company.tradeName || company.name, sz: 14, bold: true, col: WHITE, gap: 4 });
    if (company.name && company.tradeName && company.name !== company.tradeName)
      left.push({ s: company.name, sz: 8, bold: false, col: GHOST, gap: 3 });
    {
      const p: string[] = [];
      if (company.cnpj)  p.push(`CNPJ ${company.cnpj}`);
      if (company.phone) p.push(company.phone);
      if (p.length) left.push({ s: p.join("   ·   "), sz: 8, bold: false, col: GHOST, gap: 2.5 });
    }
    if (company.email) left.push({ s: company.email, sz: 8, bold: false, col: GHOST, gap: 0 });

    let leftH = logoH > 0 ? logoH + 3 : 0;
    left.forEach(l => { leftH += l.sz * 0.352 + l.gap; });

    const rightH = 7 * 0.352 + 3 + 16 * 0.352 + 3 + 7.5 * 0.352 + 3 + 8 * 0.352;
    const PAD = 10;
    const HDR = PAD * 2 + Math.max(leftH, rightH);

    box(0, 0, PW, HDR, NAVY);

    // esquerda
    let ly = PAD;
    if (logo && logoH > 0) {
      doc.addImage(logo.data, "PNG", ML, ly, logoW, logoH);
      ly += logoH + 3;
    }
    left.forEach((l) => {
      f(l.sz, l.bold ? "bold" : "normal", l.col);
      t(l.s, ML, ly + l.sz * 0.352);
      ly += l.sz * 0.352 + l.gap;
    });

    // direita (centralizada verticalmente)
    const rOff = PAD + (HDR - 2 * PAD - rightH) / 2;
    let ry = rOff;
    f(7, "normal", GHOST);
    t("NOTA FISCAL", RX, ry + 7 * 0.352, "right");
    ry += 7 * 0.352 + 3;
    f(16, "bold", WHITE);
    t(invoice.number, RX, ry + 16 * 0.352, "right");
    ry += 16 * 0.352 + 3;
    f(7.5, "normal", GHOST);
    t(`Emissão: ${fmtDate(invoice.issueDate)}`, RX, ry + 7.5 * 0.352, "right");
    ry += 7.5 * 0.352 + 3;

    // badge de status
    const sLabel = statusLabel[invoice.status] ?? invoice.status.toUpperCase();
    const sCol   = statusColor[invoice.status] ?? GHOST;
    const sBadgeW = (doc.getTextWidth(sLabel) as number) + 8;
    box(RX - sBadgeW, ry - 0.5, sBadgeW, 5.5, sCol);
    f(6.5, "bold", WHITE);
    t(sLabel, RX - sBadgeW / 2, ry + 3.5, "center");

    Y = HDR + 10;

    // ══════════════════════════════════════════════════════════════════════
    // 2. EMITENTE + DESTINATÁRIO
    // ══════════════════════════════════════════════════════════════════════
    np(40);

    const halfW = (CW - 8) / 2;

    // coluna emitente (esquerda)
    f(7, "bold", MUTED);
    t("EMITENTE", ML, Y);
    Y += 4;
    f(11, "bold", DARK);
    t(company.tradeName || company.name, ML, Y);
    Y += 5;
    f(8.5, "normal", BODY);
    const emitLines: string[] = [];
    if (company.cnpj)  emitLines.push(`CNPJ: ${company.cnpj}`);
    if (company.email) emitLines.push(company.email);
    if (company.phone) emitLines.push(company.phone);
    const addr = company.address;
    if (addr?.street) {
      const a1 = `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ""}`;
      const a2 = `${addr.neighborhood} — ${addr.city}/${addr.state}`;
      emitLines.push(a1, a2);
    }
    const emitStartY = Y - 4 - 5;
    emitLines.forEach((l) => { t(l, ML, Y); Y += 4.5; });

    // coluna destinatário (direita) — mesmo nível
    const sx = ML + halfW + 8;
    const destLines: string[] = [];
    const destName = client?.name ?? invoice.clientName;
    if (client?.document)
      destLines.push(`${client.documentType === "cnpj" ? "CNPJ" : "CPF"}: ${client.document}`);
    if (client?.email)   destLines.push(client.email);
    if (client?.phone)   destLines.push(client.phone);
    if (client?.address?.street) {
      const ca = client.address;
      destLines.push(`${ca.street}, ${ca.number}${ca.complement ? ` - ${ca.complement}` : ""}`);
      destLines.push(`${ca.neighborhood} — ${ca.city}/${ca.state}`);
    }

    f(7, "bold", MUTED);
    t("DESTINATÁRIO", sx, emitStartY);
    f(11, "bold", DARK);
    t(destName, sx, emitStartY + 4);
    f(8.5, "normal", BODY);
    let dy = emitStartY + 4 + 5;
    destLines.forEach((l) => { t(l, sx, dy); dy += 4.5; });

    Y = Math.max(Y, dy);
    Y += 8;
    hl(Y, BORDER, 0.3);
    Y += 8;

    // ══════════════════════════════════════════════════════════════════════
    // 3. ITENS
    // ══════════════════════════════════════════════════════════════════════
    f(7, "bold", MUTED);
    t("ITENS DA NOTA FISCAL", ML, Y);
    Y += 2.5;
    hl(Y, BORDER, 0.3);
    Y += 6;

    // Colunas: Desc(118) Qtd(16) Unit(24) Total(20) = 178 = CW
    const C = {
      d: { x: ML,        w: 116 },
      q: { x: ML + 116,  w: 16  },
      u: { x: ML + 132,  w: 24  },
      T: { x: ML + 156,  w: 22  },
    };

    const TH = 7.5;
    const drawHeader = () => {
      box(ML, Y, CW, TH, NAVY);
      f(7, "bold", WHITE);
      const hY = Y + TH / 2 + 1.4;
      t("Descrição",   C.d.x + 3,              hY);
      t("Qtd",         C.q.x + C.q.w / 2,      hY, "center");
      t("Preço Unit.", C.u.x + C.u.w,           hY, "right");
      t("Total",       C.T.x + C.T.w,           hY, "right");
      Y += TH;
    };
    drawHeader();

    if (invoice.items && invoice.items.length > 0) {
      invoice.items.forEach((item, idx) => {
        const nw: string[] = doc.splitTextToSize(item.description, C.d.w - 6);
        const rH = Math.max(3 + nw.length * 5 + 3, 11);

        if (Y + rH > 281) { doc.addPage(); Y = ML; drawHeader(); }

        box(ML, Y, CW, rH, idx % 2 === 0 ? WHITE : LIGHT);
        hl(Y + rH, BORDER, 0.2);

        let ty = Y + 3 + 5 * 0.36;
        f(9, "normal", DARK);
        nw.forEach((ln: string) => { t(ln, C.d.x + 3, ty); ty += 5; });

        const mid = Y + rH / 2 + 1.5;
        f(9, "normal", BODY);
        t(String(item.quantity),          C.q.x + C.q.w / 2, mid, "center");
        t(formatCurrency(item.unitPrice), C.u.x + C.u.w,     mid, "right");
        f(9, "bold", DARK);
        t(formatCurrency(item.total),     C.T.x + C.T.w,     mid, "right");
        Y += rH;
      });
    }

    hl(Y, NAVY, 0.5);
    Y += 10;

    // ══════════════════════════════════════════════════════════════════════
    // 4. TOTAL
    // ══════════════════════════════════════════════════════════════════════
    np(20);

    const TX  = RX - 64;
    const TRH = 7.5;

    // linha subtotal (se tiver mais de 1 item, é igual ao total nesse caso)
    f(8.5, "normal", MUTED);
    t("Valor Total", TX, Y + TRH / 2 + 1.5);
    f(9, "normal", BODY);
    t(formatCurrency(invoice.value), RX, Y + TRH / 2 + 1.5, "right");
    Y += TRH;
    hl(Y, BORDER, 0.2);
    Y += 4;

    // bloco total destacado
    np(15);
    box(TX - 1, Y, 65, 12, NAVY);
    f(7.5, "bold", GHOST);
    t("TOTAL DA NOTA", TX + 4, Y + 4.8);
    f(13, "bold", WHITE);
    t(formatCurrency(invoice.value), RX - 3, Y + 9.2, "right");
    Y += 18;

    // ══════════════════════════════════════════════════════════════════════
    // 5. CHAVE NF-e (se existir)
    // ══════════════════════════════════════════════════════════════════════
    if (invoice.key) {
      np(18);
      f(7, "bold", MUTED);
      t("CHAVE NF-e", ML, Y);
      Y += 2.5;
      hl(Y, BORDER, 0.3);
      Y += 6;
      box(ML, Y - 1, CW, 9, LIGHT, BORDER);
      f(7.5, "normal", BODY);
      t(invoice.key, ML + 4, Y + 4.5);
      Y += 14;
    }

    // ══════════════════════════════════════════════════════════════════════
    // 6. RODAPÉ
    // ══════════════════════════════════════════════════════════════════════
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      const footerY = 297 - 8;
      hl(footerY - 3, BORDER, 0.2);
      f(7, "normal", GHOST);
      t(
        `${company.tradeName || company.name}  —  Documento gerado em ${new Date().toLocaleDateString("pt-BR")}`,
        PW / 2,
        footerY,
        "center",
      );
      if (totalPages > 1) {
        f(7, "normal", GHOST);
        t(`Página ${i} de ${totalPages}`, RX, footerY, "right");
      }
    }

    doc.save(`nota-fiscal-${invoice.number}.pdf`);
  });
}
