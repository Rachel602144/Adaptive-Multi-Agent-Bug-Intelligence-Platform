import type { LucideIcon } from "lucide-react";
import { Card } from "./ui/Card";

export function StatCard({
  label,
  value,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  accent?: "default" | "danger" | "warning";
  icon?: LucideIcon;
}) {
  const valueColor =
    accent === "danger" ? "text-red-400" : accent === "warning" ? "text-orange-400" : "text-white";

  return (
    <Card className="p-5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />}
        {label}
      </div>
      <div className={`mt-1.5 text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </Card>
  );
}
