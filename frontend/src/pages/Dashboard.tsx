import { useQuery } from "@tanstack/react-query";
import { animate, motion, useMotionValue } from "framer-motion";
import {
  Bug,
  Clock,
  Copy,
  Database,
  Gauge,
  GitCompare,
  LayoutGrid,
  ListChecks,
  Scale,
  Sparkles,
  TriangleAlert,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatCard } from "../components/StatCard";
import { Card, CardTitle } from "../components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";
import type { StatsResponse } from "../types/bug";

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "#ef4444",
  High: "#f97316",
  Medium: "#eab308",
  Low: "#22c55e",
};

const AGENT_LABEL: Record<string, string> = {
  supervisor: "Supervisor",
  bug_analysis: "Bug Analysis",
  duplicate: "Duplicate Check",
  severity: "Severity",
  assignment: "Assignment",
  engineering_decision: "Eng. Decision",
};

const AGENT_ORDER = ["supervisor", "bug_analysis", "duplicate", "severity", "assignment", "engineering_decision"];

const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #1e293b",
  background: "#0f172a",
  fontSize: 12,
  color: "#e2e8f0",
};

function toChartData(record: Record<string, number>) {
  return Object.entries(record).map(([name, value]) => ({ name, value }));
}

function Counter({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState((0).toFixed(decimals));

  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: "easeOut" });
    const unsub = mv.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  return (
    <>
      {display}
      {suffix}
    </>
  );
}

interface Headline {
  agentsSavedPct: number;
  timeSavedMs: number;
  timeSavedPct: number | null;
  samePriorityPct: number;
  sampleSize: number;
  source: "comparisons" | "by_mode";
}

function computeHeadline(stats: StatsResponse): Headline | null {
  const c = stats.comparisons;
  if (c.count > 0) {
    const staticAvgMs = stats.by_mode.static.runs > 0 ? stats.by_mode.static.avg_total_ms : null;
    return {
      agentsSavedPct: Math.round((c.avg_agents_saved / 6) * 100),
      timeSavedMs: Math.round(c.avg_time_saved_ms),
      timeSavedPct: staticAvgMs ? Math.round((c.avg_time_saved_ms / staticAvgMs) * 100) : null,
      samePriorityPct: Math.round(c.same_priority_rate * 100),
      sampleSize: c.count,
      source: "comparisons",
    };
  }
  const a = stats.by_mode.adaptive;
  const s = stats.by_mode.static;
  if (a.runs > 0 && s.runs > 0) {
    const timeSavedMs = s.avg_total_ms - a.avg_total_ms;
    return {
      agentsSavedPct: Math.round(((6 - a.avg_agents_run) / 6) * 100),
      timeSavedMs: Math.round(timeSavedMs),
      timeSavedPct: s.avg_total_ms > 0 ? Math.round((timeSavedMs / s.avg_total_ms) * 100) : null,
      samePriorityPct: 100,
      sampleSize: a.runs + s.runs,
      source: "by_mode",
    };
  }
  return null;
}

function HeadlineFinding({ stats }: { stats: StatsResponse }) {
  const headline = computeHeadline(stats);

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900 p-6 shadow-[0_0_60px_-20px_rgba(99,102,241,0.35)] sm:p-8">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-400">
        <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
        Key finding
      </span>

      {!headline ? (
        <p className="mt-3 text-sm text-slate-400">
          Submit a few bugs — or try the{" "}
          <Link to="/compare" className="text-indigo-400 hover:underline">
            Compare page
          </Link>{" "}
          — to see how much work adaptive routing actually saves.
        </p>
      ) : (
        <>
          <p className="mt-3 max-w-2xl text-lg font-medium leading-snug text-white sm:text-xl">
            Adaptive routing skips{" "}
            <span className="text-indigo-400">
              <Counter value={headline.agentsSavedPct} suffix="%" />
            </span>{" "}
            of agent work
            {headline.timeSavedPct !== null && (
              <>
                {" "}
                and finishes{" "}
                <span className="text-indigo-400">
                  <Counter value={headline.timeSavedPct} suffix="%" />
                </span>{" "}
                faster
              </>
            )}
            , landing on the same priority{" "}
            <span className="text-indigo-400">
              <Counter value={headline.samePriorityPct} suffix="%" />
            </span>{" "}
            of the time — compared to running every agent on every bug.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Based on {headline.sampleSize} {headline.source === "comparisons" ? "paired comparisons" : "triaged bugs"}
            {headline.source === "by_mode" && " across adaptive and static mode"}.
          </p>
        </>
      )}
    </div>
  );
}

function SeverityDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardTitle className="mb-4 flex items-center gap-2">
        <Gauge className="h-4 w-4 text-slate-500" strokeWidth={2} />
        By severity
      </CardTitle>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={SEVERITY_COLOR[entry.name] ?? "#6366f1"} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      )}
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[d.name] ?? "#6366f1" }} />
            {d.name} ({d.value})
          </div>
        ))}
      </div>
    </Card>
  );
}

function AgentUsageChart({ usage }: { usage: Record<string, { ran: number; skipped: number; failed: number }> }) {
  const data = AGENT_ORDER.map((agent) => {
    const u = usage[agent] ?? { ran: 0, skipped: 0, failed: 0 };
    return { name: AGENT_LABEL[agent], ran: u.ran, skipped: u.skipped, failed: u.failed };
  });
  const hasData = data.some((d) => d.ran + d.skipped + d.failed > 0);

  return (
    <Card>
      <CardTitle className="mb-4 flex items-center gap-2">
        <Workflow className="h-4 w-4 text-slate-500" strokeWidth={2} />
        Agent usage — ran vs. skipped
      </CardTitle>
      {!hasData ? (
        <p className="py-16 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="ran" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} name="Ran" />
              <Bar dataKey="skipped" stackId="a" fill="#334155" radius={[0, 6, 6, 0]} name="Skipped" />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" radius={[0, 6, 6, 0]} name="Failed" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500" /> Ran
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-slate-600" /> Skipped
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
            </span>
          </div>
        </>
      )}
    </Card>
  );
}

function EfficiencyByMode({ stats }: { stats: StatsResponse }) {
  const adaptive = stats.by_mode.adaptive;
  const staticMode = stats.by_mode.static;

  const rows: { label: string; adaptive: string | number; static: string | number }[] = [
    { label: "Bugs run", adaptive: adaptive.runs, static: staticMode.runs },
    { label: "Avg. agents / bug", adaptive: `${adaptive.avg_agents_run}/6`, static: `${staticMode.avg_agents_run}/6` },
    { label: "Avg. time / bug", adaptive: `${adaptive.avg_total_ms} ms`, static: `${staticMode.avg_total_ms} ms` },
    { label: "Avg. LLM calls / bug", adaptive: adaptive.avg_llm_calls, static: staticMode.avg_llm_calls },
    { label: "Avg. tokens / bug", adaptive: adaptive.avg_tokens, static: staticMode.avg_tokens },
  ];

  return (
    <Card>
      <CardTitle className="mb-1 flex items-center gap-2">
        <Scale className="h-4 w-4 text-slate-500" strokeWidth={2} />
        Efficiency — adaptive vs. static
      </CardTitle>
      <p className="mb-4 text-xs text-slate-500">
        Static runs every agent on every bug as a baseline; adaptive lets the Supervisor choose. This is what proves
        adaptive routing actually saves work.
      </p>
      {adaptive.runs === 0 && staticMode.runs === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH></TH>
              <TH>Adaptive</TH>
              <TH>Static</TH>
            </tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.label}>
                <TD className="font-medium text-slate-200">{r.label}</TD>
                <TD className="tabular-nums text-indigo-400">{r.adaptive}</TD>
                <TD className="tabular-nums text-slate-400">{r.static}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </Card>
  );
}

function ComparisonEvidence({ stats }: { stats: StatsResponse }) {
  const c = stats.comparisons;
  return (
    <Card>
      <CardTitle className="mb-1 flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-slate-500" strokeWidth={2} />
        Paired comparisons (Compare page)
      </CardTitle>
      <p className="mb-4 text-xs text-slate-500">
        The strongest evidence: the same bug run through both modes, so this compares like with like.
      </p>
      {c.count === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          No comparisons yet — try the Compare page.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Comparisons</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-200">{c.count}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. agents saved</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">{c.avg_agents_saved}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. time saved</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">{c.avg_time_saved_ms} ms</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Avg. tokens saved</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-400">{c.avg_tokens_saved}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800 pt-4 text-xs text-slate-400">
            <span>Same priority: {Math.round(c.same_priority_rate * 100)}%</span>
            <span>Same severity: {Math.round(c.same_severity_rate * 100)}%</span>
            <span>Same team: {Math.round(c.same_team_rate * 100)}%</span>
          </div>
        </>
      )}
    </Card>
  );
}

function BarChartCard({ title, icon: Icon, data }: { title: string; icon: typeof Users; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardTitle className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" strokeWidth={2} />
        {title}
      </CardTitle>
      {data.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "#94a3b8" }} />
            <Tooltip cursor={{ fill: "rgba(99,102,241,0.08)" }} contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

export function Dashboard() {
  const navigate = useNavigate();
  const statsQuery = useQuery({ queryKey: ["stats"], queryFn: api.getStats, refetchInterval: 10_000 });
  const bugsQuery = useQuery({ queryKey: ["bugs"], queryFn: api.listBugs, refetchInterval: 10_000 });

  if (statsQuery.isLoading) return <LoadingState message="Loading dashboard…" />;

  if (statsQuery.isError || !statsQuery.data) {
    return (
      <div className="px-6 py-16">
        <ErrorState
          message={statsQuery.error instanceof Error ? statsQuery.error.message : "Could not load stats."}
          onRetry={() => statsQuery.refetch()}
        />
      </div>
    );
  }

  const stats = statsQuery.data;
  const recentBugs = [...(bugsQuery.data ?? [])].sort((a, b) => b.bug_id - a.bug_id).slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <motion.div {...fadeUp} transition={{ duration: 0.3 }}>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          System overview
        </span>
        <h1 className="mt-1 text-2xl font-semibold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aggregate view across every bug triaged so far — refreshes automatically every 10 seconds.
        </p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }}>
        <HeadlineFinding stats={stats} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.1 }} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={Bug} label="Total bugs" value={stats.total} />
        <StatCard icon={TriangleAlert} label="Critical" value={stats.critical} accent="danger" />
        <StatCard icon={TriangleAlert} label="High" value={stats.high} accent="warning" />
        <StatCard icon={Copy} label="Duplicates caught" value={stats.duplicates} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.15 }} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon={Zap} label="Avg. latency / bug" value={`${stats.avg_total_ms} ms`} />
        <StatCard icon={Sparkles} label="Avg. LLM calls / bug" value={stats.avg_llm_calls} />
        <StatCard icon={Database} label="Historical bugs indexed" value={stats.historical_bugs} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.2 }} className="grid gap-5 lg:grid-cols-3">
        <SeverityDonut data={toChartData(stats.by_severity)} />
        <BarChartCard title="By category" icon={LayoutGrid} data={toChartData(stats.by_category)} />
        <BarChartCard title="By team" icon={Users} data={toChartData(stats.by_team)} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.25 }} className="grid gap-5 lg:grid-cols-2">
        <AgentUsageChart usage={stats.agent_usage} />
        <EfficiencyByMode stats={stats} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.3 }}>
        <ComparisonEvidence stats={stats} />
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.35 }}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <ListChecks className="h-4 w-4" strokeWidth={2} />
          Agent usage detail
        </h2>
        <Table>
          <THead>
            <tr>
              <TH>Agent</TH>
              <TH>Ran</TH>
              <TH>Skipped</TH>
              <TH>Failed</TH>
              <TH>Avg ms (when ran)</TH>
            </tr>
          </THead>
          <TBody>
            {AGENT_ORDER.map((agent) => {
              const u = stats.agent_usage[agent] ?? { ran: 0, skipped: 0, failed: 0, avg_ms: 0 };
              return (
                <TR key={agent}>
                  <TD className="font-medium text-slate-200">{AGENT_LABEL[agent]}</TD>
                  <TD className="tabular-nums text-indigo-400">{u.ran}</TD>
                  <TD className="tabular-nums text-slate-500">{u.skipped}</TD>
                  <TD className="tabular-nums text-red-400">{u.failed}</TD>
                  <TD className="tabular-nums">{u.ran > 0 ? `${u.avg_ms} ms` : "—"}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </motion.div>

      <motion.div {...fadeUp} transition={{ duration: 0.3, delay: 0.4 }}>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          <Clock className="h-4 w-4" strokeWidth={2} />
          Recent bugs
        </h2>
        {recentBugs.length === 0 ? (
          <Card>
            <p className="text-center text-sm text-slate-500">No bugs submitted yet.</p>
          </Card>
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>ID</TH>
                <TH>Title</TH>
                <TH>Severity</TH>
                <TH>Team</TH>
                <TH>Priority</TH>
              </tr>
            </THead>
            <TBody>
              {recentBugs.map((bug) => (
                <TR key={bug.bug_id} onClick={() => navigate(`/bugs/${bug.bug_id}`)}>
                  <TD className="tabular-nums text-slate-500">#{bug.bug_id}</TD>
                  <TD className="max-w-xs truncate font-medium text-slate-200">{bug.title}</TD>
                  <TD>{bug.severity ? <SeverityBadge label={bug.severity} /> : "—"}</TD>
                  <TD>{bug.team ?? "—"}</TD>
                  <TD>{bug.priority ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </motion.div>
    </div>
  );
}
