import clsx from "clsx";
import { Badge } from "./ui/Badge";
import type { Severity } from "../types/bug";

const STYLES: Record<Severity, string> = {
  Critical: "bg-red-500/15 text-red-400 ring-red-500/30",
  High: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  Medium: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
  Low: "bg-green-500/15 text-green-400 ring-green-500/30",
};

export function SeverityBadge({ label, className }: { label: Severity | string; className?: string }) {
  const style = STYLES[label as Severity] ?? "bg-slate-500/15 text-slate-300 ring-slate-500/30";
  return <Badge className={clsx(style, className)}>{label}</Badge>;
}
