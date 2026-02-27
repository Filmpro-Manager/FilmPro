import { Badge } from "@/components/ui/badge";
import { appointmentStatusLabel, appointmentStatusColor } from "@/lib/utils";
import type { AppointmentStatus } from "@/types";

const colorMap = {
  blue: "blue",
  yellow: "warning",
  green: "success",
  red: "destructive",
} as const;

interface StatusBadgeProps {
  status: AppointmentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = appointmentStatusColor(status);
  const variant = colorMap[color];

  return (
    <Badge variant={variant as "blue" | "warning" | "success" | "destructive"}>
      {appointmentStatusLabel(status)}
    </Badge>
  );
}
