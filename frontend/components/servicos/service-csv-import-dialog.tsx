"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, CheckCircle2, XCircle, FileText, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useServiceCatalogStore } from "@/store/service-catalog-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateService } from "@/lib/api";
import { toast } from "sonner";
import type { ServiceCatalog, ServiceCategory } from "@/types";

// ── CSV parser ─────────────────────────────────────────────────────────────────

const HEADERS = [
  "nome", "categoria", "valor", "descricao", "ativo",
] as const;

type CSVRow = Record<typeof HEADERS[number], string>;

const VALID_CATEGORIES: ServiceCategory[] = ["automotive", "architecture"];

// Aceita tanto o valor interno quanto os rótulos em português exportados
const CATEGORY_NORMALIZE: Record<string, ServiceCategory> = {
  automotive:   "automotive",
  architecture: "architecture",
  automotivo:   "automotive",
  arquitetura:  "architecture",
};

interface ParsedRow {
  index: number;
  raw: CSVRow;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) return [];

  const sep = lines[0].includes(";") ? ";" : ",";

  const headLine = lines[0]
    .toLowerCase()
    .split(sep)
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  const allPresent = HEADERS.every((h) => headLine.includes(h));
  if (!allPresent) return [];

  const headerIdx = HEADERS.reduce<Record<string, number>>((acc, h) => {
    acc[h] = headLine.indexOf(h);
    return acc;
  }, {});

  return lines.slice(1).map((line, i) => {
    const cells: string[] = [];
    let cur = "";
    let inQuote = false;
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === sep && !inQuote) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());

    const raw = HEADERS.reduce<CSVRow>((acc, h) => {
      acc[h] = cells[headerIdx[h]] ?? "";
      return acc;
    }, {} as CSVRow);

    const errors: string[] = [];

    if (!raw.nome) errors.push("Nome obrigatório");

    const cat = raw.categoria.toLowerCase();
    if (!cat) {
      errors.push("Categoria obrigatória");
    } else if (!CATEGORY_NORMALIZE[cat]) {
      errors.push(`Categoria inválida. Use: automotive, architecture, Automotivo ou Arquitetura`);
    }

    if (!raw.valor) {
      errors.push("Valor obrigatório");
    } else {
      const priceStr = raw.valor.replace(",", ".");
      const price = parseFloat(priceStr);
      if (isNaN(price) || price < 0) errors.push("Valor inválido");
    }

    const ativoLower = raw.ativo.toLowerCase();
    if (raw.ativo && ativoLower !== "sim" && ativoLower !== "não" && ativoLower !== "nao") {
      errors.push("ativo deve ser 'Sim' ou 'Não'");
    }

    return { index: i + 2, raw, errors };
  });
}

// ── Dialog ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceCsvImportDialog({ open, onOpenChange }: Props) {
  const addService = useServiceCatalogStore((s) => s.addService);
  const { token }  = useAuthStore();

  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [fileName, setFileName]   = useState("");
  const [dragging, setDragging]   = useState(false);
  const [done, setDone]           = useState(false);
  const [importing, setImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validRows   = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  function reset() {
    setRows([]);
    setFileName("");
    setDone(false);
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Apenas arquivos .csv são aceitos");
      return;
    }
    setFileName(file.name);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast.error("O arquivo não contém dados válidos ou o cabeçalho está incorreto");
        setFileName("");
        return;
      }
      setRows(parsed);
    };
    reader.readAsText(file, "UTF-8");
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  async function handleImport() {
    if (!token) { toast.error("Sessão expirada"); return; }
    setImporting(true);
    let failed = 0;

    for (const row of validRows) {
      try {
        const priceStr = row.raw.valor.replace(",", ".");
        const ativoLower = row.raw.ativo.toLowerCase();
        const api = await apiCreateService(
          {
            name:            row.raw.nome,
            description:     row.raw.descricao  || undefined,
            category:        CATEGORY_NORMALIZE[row.raw.categoria.toLowerCase()] ?? row.raw.categoria.toLowerCase(),
            price:           parseFloat(priceStr),
          },
          token,
        );
        const service: ServiceCatalog = {
          id:              api.id,
          name:            api.name,
          description:     api.description ?? undefined,
          category:        api.category as ServiceCategory,
          price:           api.price,
          estimatedMinutes: api.estimatedMinutes ?? undefined,
          isActive:        ativoLower !== "não" && ativoLower !== "nao",
          createdAt:       api.createdAt,
        };
        addService(service);
      } catch {
        failed++;
      }
    }

    setImporting(false);
    setDone(true);
    if (failed > 0) {
      toast.warning(`${failed} serviço${failed !== 1 ? "s" : ""} não pud${failed !== 1 ? "eram" : "e"} ser importado${failed !== 1 ? "s" : ""}`);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col max-w-3xl h-[90vh] w-[calc(100%-2rem)] sm:w-full p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold">Importar Serviços via CSV</DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href="/modelo-servicos.csv"
              download="modelo-servicos.csv"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Baixar modelo
            </a>
            <button onClick={handleClose} className="rounded-sm opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Upload area */}
          {!fileName ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              )}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Clique ou arraste o arquivo CSV</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apenas arquivos <span className="font-mono">.csv</span> são aceitos
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleInput}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {rows.length} linha{rows.length !== 1 ? "s" : ""} lida{rows.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground h-7 text-xs">
                Trocar arquivo
              </Button>
            </div>
          )}

          {/* Instruções quando não tem arquivo */}
          {!fileName && (
            <div className="rounded-lg bg-muted/40 p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colunas esperadas no CSV</p>
              <div className="flex flex-wrap gap-1.5">
                {HEADERS.map((h) => (
                  <span key={h} className="font-mono text-[11px] bg-background border border-border rounded px-1.5 py-0.5 text-foreground">
                    {h}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Campos obrigatórios: <span className="font-medium text-foreground">nome</span>, <span className="font-medium text-foreground">categoria</span>, <span className="font-medium text-foreground">valor</span>.
                {" "}Categoria aceita: <span className="font-mono text-foreground">automotive</span> ou <span className="font-mono text-foreground">architecture</span>.
              </p>
            </div>
          )}

          {/* Resultado: sucesso */}
          {done && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-semibold text-foreground">
                {validRows.length} serviço{validRows.length !== 1 ? "s" : ""} importado{validRows.length !== 1 ? "s" : ""} com sucesso!
              </p>
              {invalidRows.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {invalidRows.length} linha{invalidRows.length !== 1 ? "s" : ""} ignorada{invalidRows.length !== 1 ? "s" : ""} por erro de validação.
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handleClose}>Fechar</Button>
            </div>
          )}

          {/* Resumo de validação + preview */}
          {rows.length > 0 && !done && (
            <>
              <div className="flex items-center gap-3">
                {validRows.length > 0 && (
                  <Badge variant="success" className="gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    {validRows.length} válido{validRows.length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {invalidRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1.5">
                    <XCircle className="w-3 h-3" />
                    {invalidRows.length} com erro{invalidRows.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>

              {/* Tabela preview */}
              <div className="rounded-lg border border-border overflow-x-auto">
                <table className="w-full min-w-max text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground w-8">#</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nome</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Categoria</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const ok = row.errors.length === 0;
                      return (
                        <tr
                          key={row.index}
                          className={cn(
                            "border-b border-border last:border-0",
                            ok ? "hover:bg-muted/20" : "bg-destructive/5"
                          )}
                        >
                          <td className="px-3 py-2 text-muted-foreground">{row.index}</td>
                          <td className="px-3 py-2 font-medium">
                            {row.raw.nome || <span className="text-destructive">—</span>}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.raw.categoria || <span className="text-destructive">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.raw.valor || "—"}
                          </td>
                          <td className="px-3 py-2">
                            {ok ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> OK
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 text-destructive cursor-help"
                                title={row.errors.join(" · ")}
                              >
                                <XCircle className="w-3 h-3" />
                                {row.errors[0]}
                                {row.errors.length > 1 && ` (+${row.errors.length - 1})`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {rows.length > 0 && !done && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0 bg-background">
            <p className="text-xs text-muted-foreground">
              {invalidRows.length > 0 && "Linhas com erro serão ignoradas."}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button
                size="sm"
                onClick={handleImport}
                disabled={importing || validRows.length === 0}
              >
                {importing && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Importar {validRows.length > 0 ? `${validRows.length} serviço${validRows.length !== 1 ? "s" : ""}` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
