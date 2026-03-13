import { Badge } from "@/components/ui/badge";
import { appointmentStatusLabel, appointmentStatusColor } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const colorMap = {
  blue:   "blue",
  yellow: "warning",
  green:  "success",
  red:    "destructive",
  gray:   "secondary",
  violet: "secondary",
} as const;

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = appointmentStatusColor(status);
  const variant = colorMap[color];

  // Rascunho: badge acinzentada com texto específico
  if (status === "draft") {
    return (
      <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">
        {appointmentStatusLabel(status)}
      </Badge>
    );
  }

  // Criada: badge violeta
  if (status === "created") {
    return (
      <Badge variant="secondary" className="bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300">
        {appointmentStatusLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge variant={variant as "blue" | "warning" | "success" | "destructive" | "secondary"}>
      {appointmentStatusLabel(status)}
    </Badge>
  );
}
