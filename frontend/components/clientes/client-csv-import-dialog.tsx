"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, CheckCircle2, XCircle, AlertTriangle, FileText, X, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useClientsStore } from "@/store/clients-store";
import { useAuthStore } from "@/store/auth-store";
import { apiCreateClient, apiCreateVehicle } from "@/lib/api";
import { toast } from "sonner";
import type { Client, Vehicle } from "@/types";

// ─── CSV parser ────────────────────────────────────────────────────────────────

const HEADERS = [
  "nome", "telefone", "documento", "tipo_documento", "email",
  "data_nascimento", "veiculo_marca", "veiculo_modelo", "veiculo_placa",
  "veiculo_cor", "veiculo_ano", "observacoes",
] as const;

type CSVRow = Record<typeof HEADERS[number], string>;

interface ParsedRow {
  index: number;
  raw: CSVRow;
  errors: string[];
  client?: Client;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim() !== "");

  if (lines.length < 2) return [];

  // Detecta separador: vírgula ou ponto-e-vírgula
  const sep = lines[0].includes(";") ? ";" : ",";

  // Valida cabeçalho
  const headLine = lines[0].toLowerCase().split(sep).map((h) => h.trim().replace(/"/g, ""));
  const headerOk = HEADERS.every((h) => headLine.includes(h));
  if (!headerOk) return [];

  const headerIdx = HEADERS.reduce<Record<string, number>>((acc, h) => {
    acc[h] = headLine.indexOf(h);
    return acc;
  }, {});

  return lines.slice(1).map((line, i) => {
    // Divide respeitando campos entre aspas
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

    // Validações obrigatórias
    if (!raw.nome) errors.push("Nome obrigatório");
    if (!raw.telefone) errors.push("Telefone obrigatório");

    // Tipo documento
    const tipoDoc = raw.tipo_documento.toLowerCase();
    if (raw.tipo_documento && tipoDoc !== "cpf" && tipoDoc !== "cnpj")
      errors.push("tipo_documento deve ser 'cpf' ou 'cnpj'");

    // Data
    if (raw.data_nascimento && !/^\d{4}-\d{2}-\d{2}$/.test(raw.data_nascimento))
      errors.push("data_nascimento deve ser AAAA-MM-DD");

    // Ano do veículo
    if (raw.veiculo_ano) {
      const yr = Number(raw.veiculo_ano);
      if (isNaN(yr) || yr < 1900 || yr > new Date().getFullYear() + 2)
        errors.push("veiculo_ano inválido");
    }

    if (errors.length > 0) return { index: i + 2, raw, errors };

    // Monta veículo se tiver placa ou modelo
    let vehicle: Vehicle | undefined;
    if (raw.veiculo_marca || raw.veiculo_modelo || raw.veiculo_placa) {
      vehicle = {
        id:    crypto.randomUUID(),
        brand: raw.veiculo_marca || "—",
        model: raw.veiculo_modelo || "—",
        plate: raw.veiculo_placa || "—",
        color: raw.veiculo_cor   || undefined,
        year:  raw.veiculo_ano   ? Number(raw.veiculo_ano) : undefined,
      };
    }

    const client: Client = {
      id:              crypto.randomUUID(),
      name:            raw.nome,
      phone:           raw.telefone,
      document:        raw.documento   || undefined,
      documentType:    raw.tipo_documento ? (tipoDoc as "cpf" | "cnpj") : undefined,
      email:           raw.email        || undefined,
      birthDate:       raw.data_nascimento || undefined,
      vehicle,
      vehicles:        vehicle ? [vehicle] : [],
      serviceHistory:  [],
      notes:           raw.observacoes  || undefined,
      createdAt:       new Date().toISOString().slice(0, 10),
      totalSpent:      0,
    };

    return { index: i + 2, raw, errors: [], client };
  });
}

// ─── Dialog ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientCsvImportDialog({ open, onOpenChange }: Props) {
  const addClients = useClientsStore((s) => s.addClients);
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
    if (!file.name.endsWith(".csv")) return;
    setFileName(file.name);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
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
    const created: Client[] = [];
    let failed = 0;

    for (const row of validRows) {
      try {
        const api = await apiCreateClient({
          name:     row.raw.nome,
          phone:    row.raw.telefone    || undefined,
          email:    row.raw.email       || undefined,
          document: row.raw.documento   || undefined,
          notes:    row.raw.observacoes || undefined,
        }, token);

        let vehicle: Vehicle | undefined;
        if (row.raw.veiculo_marca || row.raw.veiculo_modelo || row.raw.veiculo_placa) {
          const apiV = await apiCreateVehicle(api.id, {
            brand: row.raw.veiculo_marca  || "—",
            model: row.raw.veiculo_modelo || "—",
            plate: row.raw.veiculo_placa  || undefined,
            color: row.raw.veiculo_cor    || undefined,
            year:  row.raw.veiculo_ano    ? Number(row.raw.veiculo_ano) : undefined,
          }, token);
          vehicle = {
            id:    apiV.id,
            brand: apiV.brand,
            model: apiV.model,
            plate: apiV.plate ?? "",
            color: apiV.color ?? undefined,
            year:  apiV.year  ?? undefined,
          };
        }

        const tipoDoc = row.raw.tipo_documento.toLowerCase();
        created.push({
          id:           api.id,
          name:         api.name,
          phone:        api.phone    ?? "",
          email:        api.email    ?? undefined,
          document:     api.document ?? undefined,
          documentType: tipoDoc === "cpf" || tipoDoc === "cnpj" ? tipoDoc : undefined,
          birthDate:    row.raw.data_nascimento || undefined,
          vehicle,
          vehicles:     vehicle ? [vehicle] : [],
          notes:        api.notes ?? undefined,
          serviceHistory: [],
          createdAt:    api.createdAt,
          totalSpent:   0,
        });
      } catch {
        failed++;
      }
    }

    addClients(created);
    setImporting(false);
    setDone(true);
    if (failed > 0) {
      toast.warning(`${failed} cliente${failed !== 1 ? "s" : ""} não puderam ser importados`);
    }
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex flex-col max-w-3xl h-[90vh] w-[calc(100%-2rem)] sm:w-full p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex-row items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-base font-semibold">Importar Clientes via CSV</DialogTitle>
          <div className="flex items-center gap-2">
            <a
              href="/modelo-clientes.csv"
              download="modelo-clientes.csv"
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

          {/* Instrucoes quando nao tem arquivo */}
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
                Campos obrigatórios: <span className="font-medium text-foreground">nome</span>, <span className="font-medium text-foreground">telefone</span>. Demais são opcionais.
              </p>
            </div>
          )}

          {/* Resultado: sucesso total */}
          {done && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-semibold text-foreground">
                {validRows.length} cliente{validRows.length !== 1 ? "s" : ""} importado{validRows.length !== 1 ? "s" : ""} com sucesso!
              </p>
              {invalidRows.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {invalidRows.length} linha{invalidRows.length !== 1 ? "s" : ""} ignorada{invalidRows.length !== 1 ? "s" : ""} por erro de validação.
                </p>
              )}
              <Button variant="outline" size="sm" onClick={handleClose}>Fechar</Button>
            </div>
          )}

          {/* Resumo de validação */}
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
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Telefone</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Documento</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Veículo</th>
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
                          <td className="px-3 py-2 font-medium text-foreground">{row.raw.nome || <span className="text-destructive">—</span>}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.raw.telefone || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.raw.documento
                              ? <span>{row.raw.documento} <span className="uppercase text-[10px]">({row.raw.tipo_documento})</span></span>
                              : "—"
                            }
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {row.raw.veiculo_marca
                              ? `${row.raw.veiculo_marca} ${row.raw.veiculo_modelo} ${row.raw.veiculo_placa ? `· ${row.raw.veiculo_placa}` : ""}`.trim()
                              : "—"
                            }
                          </td>
                          <td className="px-3 py-2">
                            {ok ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <div className="flex items-start gap-1">
                                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                <span className="text-destructive leading-tight">{row.errors.join("; ")}</span>
                              </div>
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
          <div className="shrink-0 border-t border-border px-6 py-4 flex items-center justify-between gap-3 bg-card">
            <p className="text-xs text-muted-foreground">
              {invalidRows.length > 0 && `${invalidRows.length} linha${invalidRows.length !== 1 ? "s" : ""} com erro serão ignoradas.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
              <Button
                size="sm"
                disabled={validRows.length === 0 || importing}
                onClick={handleImport}
              >
                {importing
                  ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Importando...</>
                  : `Importar ${validRows.length} cliente${validRows.length !== 1 ? "s" : ""}`
                }
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
