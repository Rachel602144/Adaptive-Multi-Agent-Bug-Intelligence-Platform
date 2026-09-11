import clsx from "clsx";
import { Badge } from "./ui/Badge";

const STYLES: Record<string, string> = {
  P1: "bg-red-500/15 text-red-400 ring-red-500/30",
  P2: "bg-orange-500/15 text-orange-400 ring-orange-500/30",
  P3: "bg-yellow-500/15 text-yellow-400 ring-yellow-500/30",
  P4: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return <Badge className={clsx(STYLES[priority] ?? STYLES.P4, className)}>{priority}</Badge>;
}
