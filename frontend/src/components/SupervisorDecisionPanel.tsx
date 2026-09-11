import clsx from "clsx";
import { motion } from "framer-motion";
import {
  Brain,
  Check,
  ClipboardCheck,
  Copy,
  Gauge,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import type { AgentName, ExecutionTraceEntry, Metrics } from "../types/bug";

const AGENT_ORDER: AgentName[] = [
  "supervisor",
  "bug_analysis",
  "duplicate",
  "severity",
  "assignment",
  "engineering_decision",
];

const AGENT_LABEL: Record<AgentName, string> = {
  supervisor: "Supervisor",
  bug_analysis: "Bug Analysis",
  duplicate: "Duplicate",
  severity: "Severity",
  assignment: "Assignment",
  engineering_decision: "Engineering Decision",
};

const AGENT_ICON: Record<AgentName, typeof Brain> = {
  supervisor: Brain,
  bug_analysis: Search,
  duplicate: Copy,
  severity: Gauge,
  assignment: UserCheck,
  engineering_decision: ClipboardCheck,
};

// A source counts as a real AI/ML decision unless it's a deterministic fallback
// (rules / static routing / template text / the no-model default).
const NON_AI_SOURCES = new Set(["rules", "static", "template", "default"]);
export const isAiSource = (source: string | undefined) => Boolean(source) && !NON_AI_SOURCES.has(source!);

type PathKind = "short_circuit" | "full" | "light" | "adaptive";

const PATH_STYLE: Record<PathKind, string> = {
  short_circuit: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  full: "bg-indigo-500/15 text-indigo-400 ring-indigo-500/30",
  light: "bg-green-500/15 text-green-400 ring-green-500/30",
  adaptive: "bg-violet-500/15 text-violet-400 ring-violet-500/30",
};

function pathBadge(shortCircuit: boolean, agentsRun: number): { kind: PathKind; label: string } {
  if (shortCircuit) return { kind: "short_circuit", label: `Duplicate short-circuit · ${agentsRun}/6 agents` };
  if (agentsRun === 6) return { kind: "full", label: `Full path · ${agentsRun}/6 agents` };
  if (agentsRun === 3) return { kind: "light", label: `Light path · ${agentsRun}/6 agents` };
  return { kind: "adaptive", label: `Adaptive path · ${agentsRun}/6 agents` };
}

export function DecisionTag({ source }: { source: string | undefined }) {
  if (isAiSource(source)) {
    return (
      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
        AI decision
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
      Rule-based
    </span>
  );
}

function AgentCard({ agent, entry, index }: { agent: AgentName; entry?: ExecutionTraceEntry; index: number }) {
  const status = entry?.status ?? "skipped";
  const Icon = AGENT_ICON[agent];

  const inner = (
    <div
      className={clsx(
        "flex h-full w-24 flex-col items-center gap-1.5 rounded-[11px] p-3 text-center sm:w-28 sm:gap-2 sm:p-4",
        status === "ran" && "bg-slate-900",
        status === "skipped" && "border border-dashed border-slate-700 bg-slate-900/50 opacity-60",
        status === "failed" && "border-2 border-red-500 bg-slate-900",
      )}
    >
      <Icon
        className={clsx(
          "h-4 w-4 sm:h-5 sm:w-5",
          status === "ran" && "text-indigo-400",
          status === "skipped" && "text-slate-500",
          status === "failed" && "text-red-400",
        )}
        strokeWidth={2}
      />
      <div
        className={clsx(
          "text-xs font-medium sm:text-sm",
          status === "skipped" ? "text-slate-500" : "text-slate-200",
        )}
      >
        {AGENT_LABEL[agent]}
      </div>

      {status === "ran" && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-green-400 sm:text-xs">
          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
          {entry?.ms} ms
        </div>
      )}
      {status === "failed" && (
        <div className="flex items-center gap-1 text-[11px] font-medium text-red-400 sm:text-xs">
          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={3} />
          Failed
        </div>
      )}
      {status === "skipped" && (
        <div className="leading-tight">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 sm:text-[10px]">
            Skipped
          </div>
          {entry?.source && <div className="mt-0.5 text-[9px] text-slate-600 sm:text-[10px]">{entry.source}</div>}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.15, duration: 0.3, ease: "easeOut" }}
      className={clsx(
        "rounded-xl",
        status === "ran" &&
          "bg-gradient-to-br from-indigo-500 to-violet-500 p-[1.5px] shadow-[0_0_24px_-6px_rgba(139,92,246,0.7)]",
      )}
    >
      {inner}
    </motion.div>
  );
}

function Connector({ lit, index }: { lit: boolean; index: number }) {
  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ delay: index * 0.15 + 0.1, duration: 0.2 }}
      style={{ transformOrigin: "left" }}
      className={clsx(
        "mt-[38px] h-0.5 w-3 shrink-0 sm:mt-[52px] sm:w-3",
        lit ? "bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" : "bg-slate-800",
      )}
    />
  );
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-3 py-1.5 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold tabular-nums text-slate-200">{value}</span>
    </div>
  );
}

const OPTIONAL_AGENTS: AgentName[] = ["duplicate", "severity", "assignment"];

export function SupervisorDecisionPanel({
  trace,
  metrics,
  shortCircuit,
  selectedAgents,
  supervisorReason,
}: {
  trace: ExecutionTraceEntry[];
  metrics: Metrics;
  shortCircuit: boolean;
  selectedAgents: string[];
  supervisorReason: string;
}) {
  const byAgent = new Map(trace.map((t) => [t.agent, t]));
  const badge = pathBadge(shortCircuit, metrics.agents_run);
  const supervisorSource = byAgent.get("supervisor")?.source;

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900 p-4 shadow-[0_0_60px_-20px_rgba(99,102,241,0.35)] sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6 flex justify-center"
      >
        <span
          className={clsx(
            "inline-flex items-center rounded-full px-4 py-1.5 text-sm font-semibold ring-1 ring-inset",
            PATH_STYLE[badge.kind],
          )}
        >
          {badge.label}
        </span>
      </motion.div>

      <div className="flex flex-wrap items-start justify-center gap-y-6">
        {AGENT_ORDER.map((agent, i) => {
          const entry = byAgent.get(agent);
          const next = AGENT_ORDER[i + 1] ? byAgent.get(AGENT_ORDER[i + 1]) : undefined;
          const isLast = i === AGENT_ORDER.length - 1;
          return (
            <div key={agent} className="flex items-start">
              <AgentCard agent={agent} entry={entry} index={i} />
              {!isLast && <Connector lit={entry?.status === "ran" && next?.status === "ran"} index={i} />}
            </div>
          );
        })}
      </div>

      {shortCircuit && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: AGENT_ORDER.length * 0.15 + 0.1, duration: 0.3 }}
          className="mt-5 text-center text-sm text-amber-400"
        >
          Supervisor selected all optional agents. A duplicate was found, so Severity and Assignment were skipped.
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: AGENT_ORDER.length * 0.15 + 0.15, duration: 0.35 }}
        className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-5"
      >
        <div className="mb-3">
          {selectedAgents.length === 0 ? (
            <span className="text-xs font-medium text-slate-500">No optional agents: light path</span>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {OPTIONAL_AGENTS.filter((a) => selectedAgents.includes(a)).map((a) => (
                <span
                  key={a}
                  className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-inset ring-indigo-500/20"
                >
                  {AGENT_LABEL[a]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-200">Why the Supervisor chose this path</h3>
          <DecisionTag source={supervisorSource} />
        </div>
        <p className="text-sm italic text-slate-400">“{supervisorReason}”</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: AGENT_ORDER.length * 0.15 + 0.3, duration: 0.3 }}
        className="mt-4 flex flex-wrap justify-center gap-2"
      >
        <StatChip label="Agents run" value={`${metrics.agents_run}/6`} />
        <StatChip label="Total time" value={`${metrics.total_ms} ms`} />
        <StatChip label="LLM calls" value={metrics.llm_calls} />
      </motion.div>
    </div>
  );
}
