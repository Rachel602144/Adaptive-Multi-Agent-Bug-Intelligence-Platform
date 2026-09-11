import clsx from "clsx";
import { motion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { Card } from "./ui/Card";
import type { AgentName, AgentStatus, ExecutionTraceEntry } from "../types/bug";

const AGENT_LABELS: Record<AgentName, string> = {
  supervisor: "Supervisor",
  bug_analysis: "Bug Analysis",
  duplicate: "Duplicate Check",
  severity: "Severity",
  assignment: "Assignment",
  engineering_decision: "Eng. Decision",
};

const AGENT_ORDER: AgentName[] = [
  "supervisor",
  "bug_analysis",
  "duplicate",
  "severity",
  "assignment",
  "engineering_decision",
];

const STATUS_RING: Record<AgentStatus, string> = {
  ran: "bg-indigo-500 ring-indigo-500/30 text-white",
  skipped: "bg-slate-800 ring-slate-800/60 text-slate-500",
  failed: "bg-red-500 ring-red-500/30 text-white",
};

const STATUS_TEXT: Record<AgentStatus, string> = {
  ran: "text-indigo-400",
  skipped: "text-slate-500",
  failed: "text-red-400",
};

const STATUS_ICON: Record<AgentStatus, typeof Check> = {
  ran: Check,
  skipped: Minus,
  failed: X,
};

export function AgentTraceStepper({ trace }: { trace: ExecutionTraceEntry[] }) {
  const byAgent = new Map(trace.map((t) => [t.agent, t]));

  return (
    <Card className="overflow-x-auto">
      <h3 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Agent execution path
      </h3>
      <div className="flex min-w-max items-start">
        {AGENT_ORDER.map((agent, i) => {
          const entry = byAgent.get(agent);
          const status = entry?.status ?? "skipped";
          const isLast = i === AGENT_ORDER.length - 1;
          const Icon = STATUS_ICON[status];
          return (
            <div key={agent} className="flex items-start">
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.12, duration: 0.25, ease: "easeOut" }}
                className="flex w-32 flex-col items-center text-center"
              >
                <div
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full ring-4",
                    STATUS_RING[status],
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
                <div className="mt-2 text-sm font-medium text-slate-200">{AGENT_LABELS[agent]}</div>
                <div className={clsx("mt-0.5 text-xs font-medium capitalize", STATUS_TEXT[status])}>
                  {status}
                </div>
                {entry && (
                  <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">{entry.ms} ms</div>
                )}
              </motion.div>
              {!isLast && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.12 + 0.15, duration: 0.2 }}
                  style={{ transformOrigin: "left" }}
                  className={clsx(
                    "mt-[18px] h-0.5 w-8 shrink-0",
                    status === "ran" ? "bg-indigo-500" : "bg-slate-800",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
