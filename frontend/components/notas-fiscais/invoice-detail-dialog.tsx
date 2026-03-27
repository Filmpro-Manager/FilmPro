// Módulo removido
export {};

import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Invoice } from "@/types";
import { useCompanyStore } from "@/store/company-store";
import { useClientsStore } from "@/store/clients-store";
import { generateInvoicePDF } from "./invoice-pdf";
import {
  Download,
  Building2,
  User,
  CalendarDays,
  FileText,
  Hash,
  Tag,
} from "lucide-react";

interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
}: InvoiceDetailDialogProps) {
  const { settings } = useCompanyStore();
  const clients = useClientsStore((s) => s.clients);

  if (!invoice) return null;

  const client = clients.find((c) => c.id === invoice.clientId);
  const { name, cnpj, email, address } = settings;
  const addressLine = `${address.street}, ${address.number}${address.complement ? ` — ${address.complement}` : ""} — ${address.city}/${address.state}`;

  const statusVariant: Record<string, "success" | "warning" | "destructive"> = {
    issued: "success",
    paid: "success",
    pending: "warning",
    cancelled: "destructive",
  };

  const statusLabel: Record<string, string> = {
    issued: "Emitida",
    paid: "Paga",
    pending: "Pendente",
    cancelled: "Cancelada",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Nota Fiscal — {invoice.number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Status + Tipo */}
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant[invoice.status]}>
              {statusLabel[invoice.status]}
            </Badge>
            <Badge variant="secondary" className="uppercase font-mono">
              {invoice.fileType}
            </Badge>
          </div>

          <Separator />

          {/* Emitente */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Emitente
            </h4>
            <div className="pl-5 space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">{name}</p>
              <p>CNPJ: {cnpj}</p>
              <p>{addressLine}</p>
              <p>{email}</p>
            </div>
          </div>

          {/* Destinatário */}
          <div className="space-y-2">
            <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              Destinatário
            </h4>
            <div className="pl-5 space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">
                {client?.name ?? "—"}
              </p>
              <p>{client?.document}</p>
              {client?.email && <p>{client.email}</p>}
            </div>
          </div>

          <Separator />

          {/* Itens */}
          {invoice.items && invoice.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-xs uppercase text-muted-foreground tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Itens
              </h4>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Descrição
                      </th>
                      <th className="px-3 py-2 text-center font-medium text-muted-foreground">
                        Qtd
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Unit.
                      </th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">
                          {formatCurrency(item.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <Separator />

          {/* Dados finais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Data de Emissão</p>
                <p className="font-medium">{formatDate(invoice.issueDate)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Chave NF-e</p>
                <p className="font-mono text-xs truncate">{invoice.key ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="rounded-lg bg-muted/50 p-4 flex items-center justify-between">
            <span className="font-semibold">Valor Total</span>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(invoice.value)}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => generateInvoicePDF(invoice, settings, client)}
            >
              <Download className="w-4 h-4" />
              Baixar PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
