import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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

function SeverityDonut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardTitle className="mb-4">By severity</CardTitle>
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
      <CardTitle className="mb-4">Agent usage — ran vs. skipped</CardTitle>
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
  const adaptive = stats.efficiency_by_mode.adaptive;
  const staticMode = stats.efficiency_by_mode.static;

  const rows: { label: string; adaptive: string | number; static: string | number }[] = [
    { label: "Bugs run", adaptive: adaptive.count, static: staticMode.count },
    { label: "Avg. agents / bug", adaptive: `${adaptive.avg_agents_run}/6`, static: `${staticMode.avg_agents_run}/6` },
    { label: "Avg. time / bug", adaptive: `${adaptive.avg_total_ms} ms`, static: `${staticMode.avg_total_ms} ms` },
    { label: "Avg. LLM calls / bug", adaptive: adaptive.avg_llm_calls, static: staticMode.avg_llm_calls },
  ];

  return (
    <Card>
      <CardTitle className="mb-1">Efficiency — adaptive vs. static</CardTitle>
      <p className="mb-4 text-xs text-slate-500">
        Static runs every agent on every bug as a baseline; adaptive lets the Supervisor choose. This is what proves
        adaptive routing actually saves work.
      </p>
      {adaptive.count === 0 && staticMode.count === 0 ? (
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

function BarChartCard({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
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
      <h1 className="text-2xl font-semibold text-white">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total bugs" value={stats.total} />
        <StatCard label="Critical" value={stats.critical} accent="danger" />
        <StatCard label="High" value={stats.high} accent="warning" />
        <StatCard label="Duplicates caught" value={stats.duplicates} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Avg. latency / bug" value={`${stats.avg_total_ms} ms`} />
        <StatCard label="Avg. LLM calls / bug" value={stats.avg_llm_calls} />
        <StatCard label="Historical bugs indexed" value={stats.historical_bugs} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SeverityDonut data={toChartData(stats.by_severity)} />
        <BarChartCard title="By category" data={toChartData(stats.by_category)} />
        <BarChartCard title="By team" data={toChartData(stats.by_team)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AgentUsageChart usage={stats.agent_usage} />
        <EfficiencyByMode stats={stats} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Agent usage detail</h2>
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
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Recent bugs</h2>
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
      </div>
    </div>
  );
}
