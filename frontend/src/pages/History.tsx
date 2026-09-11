import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { SeverityBadge } from "../components/SeverityBadge";
import { Card } from "../components/ui/Card";
import { Table, TBody, TD, TH, THead, TR } from "../components/ui/Table";
import { downloadCsv, toCsv } from "../lib/csv";
import type { BugSummary, Severity } from "../types/bug";

function exportBugsCsv(bugs: BugSummary[]) {
  const rows = bugs.map((b) => ({
    bug_id: b.bug_id,
    title: b.title,
    mode: b.mode,
    status: b.status,
    severity: b.severity ?? "",
    priority: b.priority ?? "",
    team: b.team ?? "",
    category: b.category ?? "",
    module: b.module ?? "",
    is_duplicate: b.is_duplicate,
    duplicate_of: b.duplicate_of ?? "",
    short_circuit: b.short_circuit,
    agents_run: b.agents_run_count,
    agents_run_list: b.agents_run.join(" "),
    total_ms: b.total_ms ?? "",
    llm_calls: b.llm_calls,
    tokens: b.tokens,
    created_at: b.created_at ?? "",
  }));
  downloadCsv(`bug-runs-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
}

const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export function History() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Severity | "All">("All");

  const { data: bugs, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bugs"],
    queryFn: api.listBugs,
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() => {
    if (!bugs) return [];
    const sorted = [...bugs].sort((a, b) => b.bug_id - a.bug_id);
    return filter === "All" ? sorted : sorted.filter((b) => b.severity === filter);
  }, [bugs, filter]);

  if (isLoading) return <LoadingState message="Loading bugs…" />;

  if (isError || !bugs) {
    return (
      <div className="px-6 py-16">
        <ErrorState
          message={error instanceof Error ? error.message : "Could not load bug history."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Bug history</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {(["All", ...SEVERITIES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                  filter === s
                    ? "bg-indigo-500 text-white"
                    : "border border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-400"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={() => exportBugsCsv(bugs)}
            disabled={bugs.length === 0}
            title="Download all runs as CSV"
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400 transition hover:border-indigo-500 hover:text-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Export CSV
          </button>
        </div>
      </div>

      {bugs.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-slate-500">No bugs yet — submit one to see it here.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-center text-sm text-slate-500">No bugs match this filter.</p>
        </Card>
      ) : (
        <Table>
          <THead>
            <tr>
              <TH>ID</TH>
              <TH>Title</TH>
              <TH>Severity</TH>
              <TH>Category</TH>
              <TH>Team</TH>
              <TH>Priority</TH>
              <TH>Path</TH>
            </tr>
          </THead>
          <TBody>
            {filtered.map((bug) => (
              <TR key={bug.bug_id} onClick={() => navigate(`/bugs/${bug.bug_id}`)}>
                <TD className="tabular-nums text-slate-500">#{bug.bug_id}</TD>
                <TD className="max-w-xs truncate font-medium text-slate-200">
                  {bug.title}
                  {bug.is_duplicate && (
                    <span className="ml-2 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                      duplicate
                    </span>
                  )}
                </TD>
                <TD>{bug.severity ? <SeverityBadge label={bug.severity} /> : <span className="text-slate-600">—</span>}</TD>
                <TD>{bug.category ?? "—"}</TD>
                <TD>{bug.team ?? "—"}</TD>
                <TD>{bug.priority ?? "—"}</TD>
                <TD className="tabular-nums text-slate-500">{bug.agents_run_count} / 6</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
