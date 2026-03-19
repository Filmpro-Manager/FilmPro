"use client";

import { useMemo } from "react";
import { Clock, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Quote } from "@/types";

interface FollowupPanelProps {
  quotes: Quote[];
  onOpenQuote: (quote: Quote) => void;
}

type FollowupItem = { quote: Quote; days: number };

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

type GroupColor = "red" | "amber" | "sky";

function FollowupGroup({
  label,
  color,
  items,
  onOpen,
}: {
  label: string;
  color: GroupColor;
  items: FollowupItem[];
  onOpen: (q: Quote) => void;
}) {
  const colorMap: Record<GroupColor, { dot: string; text: string }> = {
    red:   { dot: "bg-red-500",   text: "text-red-600 dark:text-red-400" },
    amber: { dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
    sky:   { dot: "bg-sky-500",   text: "text-sky-600 dark:text-sky-400" },
  };
  const { dot, text } = colorMap[color];

  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1.5 ${text}`}>
        <span className={`inline-block w-2 h-2 rounded-full ${dot}`} />
        {label}
      </p>
      <div className="space-y-1">
        {items.map(({ quote, days }) => (
          <div
            key={quote.id}
            className="flex items-center gap-2 text-sm px-1"
          >
            <span className="font-medium text-foreground flex-1 truncate min-w-0">
              {quote.clientName}
            </span>
            <span className="text-muted-foreground text-xs tabular-nums shrink-0">
              {formatCurrency(quote.totalValue)}
            </span>
            <span className="text-muted-foreground text-xs shrink-0 w-14 text-right">
              {days} dia{days !== 1 ? "s" : ""}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-xs shrink-0"
              onClick={() => onOpen(quote)}
            >
              Abrir <ChevronRight className="w-3 h-3 ml-0.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FollowupPanel({ quotes, onOpenQuote }: FollowupPanelProps) {
  const groups = useMemo(() => {
    const pending: FollowupItem[] = quotes
      .filter((q) => q.status === "draft" || q.status === "sent")
      .map((q) => ({ quote: q, days: daysSince(q.issueDate) }))
      .filter((x) => x.days >= 1)
      .sort((a, b) => b.days - a.days);

    const urgent: FollowupItem[] = [];
    const attention: FollowupItem[] = [];
    const recent: FollowupItem[] = [];

    for (const item of pending) {
      if (item.days >= 7) urgent.push(item);
      else if (item.days >= 3) attention.push(item);
      else recent.push(item);
    }

    return { urgent, attention, recent };
  }, [quotes]);

  const total = groups.urgent.length + groups.attention.length + groups.recent.length;
  if (total === 0) return null;

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
            Follow-up de Orçamentos
          </h3>
          <span className="ml-auto text-xs text-amber-600 dark:text-amber-500 shrink-0">
            {total} aguardando resposta
          </span>
        </div>
        <div className="space-y-3">
          {groups.urgent.length > 0 && (
            <FollowupGroup
              label={`Urgente • 7+ dias (${groups.urgent.length})`}
              color="red"
              items={groups.urgent}
              onOpen={onOpenQuote}
            />
          )}
          {groups.attention.length > 0 && (
            <FollowupGroup
              label={`Atenção • 3–6 dias (${groups.attention.length})`}
              color="amber"
              items={groups.attention}
              onOpen={onOpenQuote}
            />
          )}
          {groups.recent.length > 0 && (
            <FollowupGroup
              label={`Recente • 1–2 dias (${groups.recent.length})`}
              color="sky"
              items={groups.recent}
              onOpen={onOpenQuote}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
