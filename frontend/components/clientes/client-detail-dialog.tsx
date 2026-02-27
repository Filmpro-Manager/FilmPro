import { Phone, Mail, Car, FileText, Clock, MapPin, ExternalLink } from "lucide-react";
import type { Client } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils";

function buildMapsUrl(client: Client): string | null {
  const a = client.address;
  if (!a?.street || !a?.city) return null;
  const parts = [
    a.street,
    a.number,
    a.complement,
    a.neighborhood,
    `${a.city}${a.state ? " " + a.state : ""}`,
    a.zipCode,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts)}`;
}

function formatAddress(client: Client): string | null {
  const a = client.address;
  if (!a?.street || !a?.city) return null;
  const line1 = [a.street, a.number, a.complement].filter(Boolean).join(", ");
  const line2 = [a.neighborhood, a.city, a.state].filter(Boolean).join(" — ");
  return [line1, line2, a.zipCode].filter(Boolean).join("\n");
}

interface ClientDetailDialogProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientDetailDialog({ client, open, onOpenChange }: ClientDetailDialogProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-semibold">
              {client.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-base">{client.name}</DialogTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                {client.documentType && (
                  <Badge variant="outline" className="text-[10px]">
                    {client.documentType.toUpperCase()}
                  </Badge>
                )}
                {client.document && (
                  <span className="text-xs text-muted-foreground">{client.document}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{client.phone}</span>
            </div>
            {client.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-foreground">{client.email}</span>
              </div>
            )}
            {(() => {
              const mapsUrl  = buildMapsUrl(client);
              const addrText = formatAddress(client);
              if (!addrText) return null;
              return (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    {addrText.split("\n").map((line, i) => (
                      <p key={i} className={i === 0 ? "text-foreground" : "text-xs text-muted-foreground"}>
                        {line}
                      </p>
                    ))}
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no Google Maps"
                      className="flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap shrink-0 mt-0.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Ver no Maps
                    </a>
                  )}
                </div>
              );
            })()}
            {client.vehicle && (
              <div className="flex items-start gap-2 text-sm">
                <Car className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-foreground">
                    {client.vehicle.brand} {client.vehicle.model}
                    {client.vehicle.year && ` (${client.vehicle.year})`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {client.vehicle.plate}
                    {client.vehicle.color && ` · ${client.vehicle.color}`}
                  </p>
                </div>
              </div>
            )}
            {client.notes && (
              <div className="flex items-start gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-muted-foreground">{client.notes}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Total gasto</p>
              <p className="text-lg font-semibold text-foreground">{formatCurrency(client.totalSpent)}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Serviços</p>
              <p className="text-lg font-semibold text-foreground">{client.serviceHistory.length}</p>
            </div>
          </div>

          {client.serviceHistory.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Histórico de Serviços
                </p>
                {client.serviceHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/10"
                  >
                    <div className="flex items-center justify-center w-7 h-7 rounded-md bg-muted shrink-0 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {record.service}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(record.date)} · {record.technicianName}
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <StatusBadge status={record.status} />
                      <p className="text-xs font-semibold text-foreground">
                        {formatCurrency(record.value)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
