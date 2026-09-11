import { Card } from "./ui/Card";

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: "default" | "danger" | "warning";
}) {
  const valueColor =
    accent === "danger" ? "text-red-400" : accent === "warning" ? "text-orange-400" : "text-white";

  return (
    <Card className="p-5">
      <div className="text-sm font-medium text-slate-400">{label}</div>
      <div className={`mt-1.5 text-3xl font-semibold tabular-nums ${valueColor}`}>{value}</div>
    </Card>
  );
}
