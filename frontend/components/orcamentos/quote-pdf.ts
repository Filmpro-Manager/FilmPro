import type { Quote, CompanySettings } from "@/types";
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
const RED:    RGB = [185,  28,  28];

function fmtDate(d?: string): string {
  if (!d) return "";
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

export function generateQuotePDF(quote: Quote, company: CompanySettings): void {
  const payMethods: string[] =
    (quote as unknown as { acceptedPaymentMethods?: string[] }).acceptedPaymentMethods ??
    (quote.payment?.method ? [quote.payment.method] : []);

  const globalDisc =
    quote.discountType === "percent"
      ? quote.subtotal * (quote.discount / 100)
      : (quote.discount ?? 0);

  import("jspdf").then(async (mod) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const JsPDF = (mod.default ?? (mod as any).jsPDF ?? mod) as any;
    const doc   = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const logo = company.logoUrl ? await loadLogo(company.logoUrl) : null;

    const PW  = 210;
    const ML  = 16;
    const MR  = 16;
    const CW  = PW - ML - MR;
    const RX  = PW - MR;
    let   Y   = 0;

    // ── primitivas ───────────────────────────────────────────────────────────
    const f = (sz: number, wt: "normal" | "bold", col: RGB) => {
      doc.setFontSize(sz); doc.setFont("helvetica", wt);
      doc.setTextColor(col[0], col[1], col[2]);
    };
    const t = (s: string, x: number, y: number, align: "left" | "right" | "center" = "left") =>
      doc.text(String(s), x, y, align !== "left" ? { align } : {});
    const box = (x: number, y: number, w: number, h: number, fill: RGB, stroke?: RGB) => {
      doc.setFillColor(fill[0], fill[1], fill[2]);
      if (stroke) {
        doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
        doc.setLineWidth(0.25); doc.rect(x, y, w, h, "FD");
      } else {
        doc.setDrawColor(fill[0], fill[1], fill[2]);
        doc.rect(x, y, w, h, "F");
      }
    };
    const hl = (y: number, col: RGB, lw: number, x1 = ML, x2 = RX) => {
      doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(lw);
      doc.line(x1, y, x2, y);
    };
    const PAGE_H = 297;
    const MARGIN_B = 16;
    const SAFE = PAGE_H - MARGIN_B; // 281
    const np = (need: number) => { if (Y + need > SAFE) { doc.addPage(); Y = ML; } };

    // ════════════════════════════════════════════════════════════════════════
    // 1. CABEÇALHO
    // ════════════════════════════════════════════════════════════════════════

    // Logo sizing
    const LW = 28, LH = 10;
    let logoW = 0, logoH = 0;
    if (logo) {
      const r = logo.w / logo.h;
      logoW = LW; logoH = LW / r;
      if (logoH > LH) { logoH = LH; logoW = LH * r; }
    }

    // Linhas esquerda
    type L = { s: string; sz: number; bold: boolean; col: RGB; gap: number };
    const left: L[] = [];
    left.push({ s: company.tradeName || company.name, sz: 14, bold: true, col: WHITE, gap: 4 });
    if (company.name && company.tradeName && company.name !== company.tradeName)
      left.push({ s: company.name, sz: 8, bold: false, col: GHOST, gap: 3 });
    {
      const p: string[] = [];
      if (company.cnpj)  p.push(company.cnpj);
      if (company.phone) p.push(company.phone);
      if (p.length) left.push({ s: p.join("   ·   "), sz: 8, bold: false, col: GHOST, gap: 2.5 });
    }
    if (company.email) left.push({ s: company.email, sz: 8, bold: false, col: GHOST, gap: 0 });

    // Altura esquerda
    let leftH2 = logoH > 0 ? logoH + 3 : 0;
    left.forEach(l => { leftH2 += l.sz * 0.352 + l.gap; });

    // Altura direita: ORÇAMENTO + numero + emissão
    const rightH2 = 7 * 0.352 + 3.5 + 16 * 0.352 + 3.5 + 7.5 * 0.352;

    const PAD = 10;
    const HDR = PAD * 2 + Math.max(leftH2, rightH2);

    box(0, 0, PW, HDR, NAVY);

    // Renderiza esquerda
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

    // Renderiza direita (verticalmente centrada)
    const rOff = PAD + (HDR - 2 * PAD - rightH2) / 2;
    let ry = rOff;
    f(7, "normal", GHOST);
    t("ORÇAMENTO", RX, ry + 7 * 0.352, "right");
    ry += 7 * 0.352 + 3.5;
    f(16, "bold", WHITE);
    t(quote.number, RX, ry + 16 * 0.352, "right");
    ry += 16 * 0.352 + 3.5;
    f(7.5, "normal", GHOST);
    t(`Emissão: ${fmtDate(quote.issueDate)}`, RX, ry + 7.5 * 0.352, "right");

    Y = HDR + 10;

    // ════════════════════════════════════════════════════════════════════════
    // 2. DADOS DO CLIENTE
    // ════════════════════════════════════════════════════════════════════════

    np(32);

    // Cliente — esquerda
    const sub = quote.subject;
    let subLabel = "";
    const subRows: string[] = [];
    if (sub) {
      subLabel =
        sub.type === "vehicle"    ? "Veículo" :
        sub.type === "residence"  ? "Residência" :
        sub.type === "commercial" ? "Imóvel Comercial" : "Objeto";
      if (sub.brand || sub.model) subRows.push([sub.brand, sub.model].filter(Boolean).join(" "));
      if (sub.year)        subRows.push(`Ano ${sub.year}`);
      if (sub.plate)       subRows.push(`Placa ${sub.plate.toUpperCase()}`);
      if (sub.color)       subRows.push(`Cor ${sub.color}`);
      if (sub.address)     subRows.push(sub.address);
      if (sub.area)        subRows.push(`${sub.area} m²`);
      if (sub.description) subRows.push(sub.description);
    }

    const cliMeta: string[] = [];
    if (quote.clientPhone)    cliMeta.push(quote.clientPhone);
    if (quote.clientEmail)    cliMeta.push(quote.clientEmail);
    if (quote.clientDocument) cliMeta.push(`${quote.clientDocumentType === "cnpj" ? "CNPJ" : "CPF"} ${quote.clientDocument}`);

    const hasSub = subRows.length > 0;
    const halfW  = hasSub ? (CW - 8) / 2 : CW;

    // -- coluna cliente --
    f(7, "bold", MUTED);
    t("CLIENTE", ML, Y);
    Y += 4;
    f(12, "bold", DARK);
    t(quote.clientName, ML, Y);
    Y += 5;
    f(8.5, "normal", BODY);
    cliMeta.forEach((m) => { t(m, ML, Y); Y += 4.5; });

    // -- coluna subject (mesmo nível, lado direito) --
    if (hasSub) {
      const sx = ML + halfW + 8;
      // reset Y para início do bloco
      const savedY = Y;
      const startY = savedY - (4 + 5 + cliMeta.length * 4.5);

      f(7, "bold", MUTED);
      t(subLabel.toUpperCase(), sx, startY);
      f(12, "bold", DARK);
      t(subRows[0], sx, startY + 4);
      f(8.5, "normal", BODY);
      let sy = startY + 4 + 5;
      subRows.slice(1).forEach((r) => { t(r, sx, sy); sy += 4.5; });

      // garantir Y = máximo das duas colunas
      Y = Math.max(Y, sy);
    }

    Y += 8;
    hl(Y, BORDER, 0.3);
    Y += 8;

    // ════════════════════════════════════════════════════════════════════════
    // 3. ITENS
    // ════════════════════════════════════════════════════════════════════════

    // Colunas: #(7) Desc(85) Qtd(16) Preço(28) Desc%(18) Total(24) = 178 = CW
    const C = {
      n: { x: ML,       w: 7  },
      d: { x: ML + 7,   w: 85 },
      q: { x: ML + 92,  w: 16 },
      u: { x: ML + 108, w: 28 },
      s: { x: ML + 136, w: 18 },
      T: { x: ML + 154, w: 24 },
    };

    const TH = 7.5;

    // Função para desenhar cabeçalho da tabela (reutilizada em quebras de página)
    const drawTableHeader = () => {
      box(ML, Y, CW, TH, NAVY);
      f(7, "bold", WHITE);
      const thY = Y + TH / 2 + 1.4;
      t("#",           C.n.x + C.n.w / 2, thY, "center");
      t("Descrição",   C.d.x + 3,         thY);
      t("Qtd",         C.q.x + C.q.w / 2, thY, "center");
      t("Preço Unit.", C.u.x + C.u.w,     thY, "right");
      t("Desconto",    C.s.x + C.s.w,     thY, "right");
      t("Total",       C.T.x + C.T.w,     thY, "right");
      Y += TH;
    };

    // Garante espaço para título da seção + cabeçalho + pelo menos 1 linha
    np(2.5 + 0.3 + 6 + TH + 12);
    f(7, "bold", MUTED);
    t("ITENS DO ORÇAMENTO", ML, Y);
    Y += 2.5;
    hl(Y, BORDER, 0.3);
    Y += 6;
    drawTableHeader();

    quote.items.forEach((item, idx) => {
      const iDisc =
        item.discountType === "percent"
          ? item.unitPrice * item.quantity * (item.discount / 100)
          : (item.discount ?? 0);
      const iTotal = item.unitPrice * item.quantity - iDisc;

      const nw: string[] = doc.splitTextToSize(item.name, C.d.w - 4);
      const dw: string[] = item.description ? doc.splitTextToSize(item.description, C.d.w - 4) : [];
      // +3mm de margem de segurança para baseline offset e descenders
      const rH = Math.max(3 + nw.length * 5.5 + (dw.length > 0 ? dw.length * 4.5 + 1 : 0) + 3, 12) + 3;

      // Se a linha não cabe, quebra página e redesenha o cabeçalho da tabela
      if (Y + rH > SAFE) {
        doc.addPage();
        Y = ML;
        drawTableHeader();
      }

      box(ML, Y, CW, rH, idx % 2 === 0 ? WHITE : LIGHT);
      hl(Y + rH, BORDER, 0.2);

      f(8, "normal", GHOST);
      t(String(idx + 1), C.n.x + C.n.w / 2, Y + rH / 2 + 1.5, "center");

      let dy = Y + 3 + 5.5 * 0.36;
      f(9.5, "bold", DARK);
      nw.forEach((ln: string) => { t(ln, C.d.x + 3, dy); dy += 5.5; });
      if (dw.length > 0) {
        dy += 1;
        f(8, "normal", MUTED);
        dw.forEach((ln: string) => { t(ln, C.d.x + 3, dy); dy += 4.5; });
      }

      const mid = Y + rH / 2 + 1.5;
      f(9, "normal", BODY);
      t(`${item.quantity} ${item.unit}`, C.q.x + C.q.w / 2, mid, "center");
      t(formatCurrency(item.unitPrice),  C.u.x + C.u.w,      mid, "right");

      if (item.discount > 0) {
        f(8.5, "normal", RED);
        t(item.discountType === "percent" ? `-${item.discount}%` : `-${formatCurrency(item.discount)}`,
          C.s.x + C.s.w, mid, "right");
      } else {
        f(8.5, "normal", GHOST);
        t("—", C.s.x + C.s.w, mid, "right");
      }

      f(9.5, "bold", DARK);
      t(formatCurrency(iTotal), C.T.x + C.T.w, mid, "right");
      Y += rH;
    });

    hl(Y, NAVY, 0.5);
    Y += 10;

    // ════════════════════════════════════════════════════════════════════════
    // 4. TOTAIS
    // ════════════════════════════════════════════════════════════════════════
    np(44);

    const TX  = RX - 68;
    const TRH = 7.5;

    const totRow = (label: string, value: string, vCol: RGB = BODY) => {
      np(TRH + 2);
      f(8.5, "normal", MUTED);
      t(label, TX, Y + TRH / 2 + 1.5);
      f(9, "normal", vCol);
      t(value, RX, Y + TRH / 2 + 1.5, "right");
      Y += TRH;
      hl(Y, BORDER, 0.2);
      Y += 1;
    };

    totRow("Subtotal", formatCurrency(quote.subtotal));

    if (globalDisc > 0)
      totRow(
        quote.discountType === "percent" ? `Desconto (${quote.discount}%)` : "Desconto",
        `- ${formatCurrency(globalDisc)}`, RED
      );

    if (quote.taxes && quote.taxes > 0)
      totRow(`Impostos (${quote.taxes}%)`, formatCurrency(quote.subtotal * quote.taxes / 100));

    // Total geral
    np(15);
    Y += 3;
    box(TX - 1, Y, 69, 12, NAVY);
    f(7.5, "bold", GHOST);
    t("TOTAL GERAL", TX + 4, Y + 4.8);
    f(13, "bold", WHITE);
    t(formatCurrency(quote.totalValue), RX - 3, Y + 9.2, "right");
    Y += 18;

    // ════════════════════════════════════════════════════════════════════════
    // 5. FORMAS DE PAGAMENTO
    // ════════════════════════════════════════════════════════════════════════
    if (payMethods.length > 0) {
      np(22);
      f(7, "bold", MUTED);
      t("FORMAS DE PAGAMENTO", ML, Y);
      Y += 2.5;
      hl(Y, BORDER, 0.3);
      Y += 6;

      const TG = 7;
      let px = ML;
      payMethods.forEach((m) => {
        doc.setFontSize(8.5); doc.setFont("helvetica", "normal");
        const tw = (doc.getTextWidth(m) as number) + 10;
        if (px + tw > RX) { px = ML; Y += TG + 4; np(TG + 4); }
        box(px, Y, tw, TG, LIGHT, BORDER);
        f(8.5, "normal", DARK);
        t(m, px + 5, Y + TG / 2 + 1.5);
        px += tw + 4;
      });
      Y += TG + 8;

      if (quote.payment?.notes) {
        np(10);
        f(8.5, "normal", BODY);
        const nls: string[] = doc.splitTextToSize(quote.payment.notes, CW);
        nls.forEach((l: string) => { t(l, ML, Y); Y += 4.8; });
        Y += 3;
      }
    }

    // ════════════════════════════════════════════════════════════════════════
    // 6. OBSERVAÇÕES
    // ════════════════════════════════════════════════════════════════════════
    if (quote.notes) {
      np(22);
      f(7, "bold", MUTED);
      t("OBSERVAÇÕES", ML, Y);
      Y += 2.5;
      hl(Y, BORDER, 0.3);
      Y += 6;

      const nls: string[] = doc.splitTextToSize(quote.notes, CW - 8);
      const bH = nls.length * 5.2 + 8;
      np(bH);
      box(ML, Y - 1.5, CW, bH, LIGHT, BORDER);
      f(9, "normal", BODY);
      let ny = Y + 3;
      nls.forEach((l: string) => { t(l, ML + 5, ny); ny += 5.2; });
      Y += bH + 4;
    }

    doc.save(`orcamento-${quote.number}.pdf`);
  });
}

export function shareQuoteWhatsApp(quote: Quote, company: CompanySettings): void {
  const msg = encodeURIComponent(
    `Olá ${quote.clientName}! Segue o orçamento *${quote.number}* da *${
      company.tradeName || company.name
    }* no valor de *${formatCurrency(quote.totalValue)}*.` +
    (quote.notes ? `\n\nObs: ${quote.notes}` : "") +
    `\n\nAguardamos seu retorno!`
  );
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}