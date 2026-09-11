import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { AgentTraceStepper } from "../components/AgentTraceStepper";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PriorityBadge } from "../components/PriorityBadge";
import { SeverityBadge } from "../components/SeverityBadge";
import { Card, CardTitle } from "../components/ui/Card";
import type { Severity } from "../types/bug";

const SMART_SOURCES = new Set(["gemini", "model"]);

function SourceTag({ source }: { source: string | undefined }) {
  if (!source) return null;
  const smart = SMART_SOURCES.has(source);
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
        smart ? "bg-indigo-500/15 text-indigo-400" : "bg-slate-800 text-slate-400"
      }`}
    >
      via {source}
    </span>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value ?? "—"}</dd>
    </div>
  );
}

function SectionCard({
  title,
  source,
  skipped,
  children,
}: {
  title: string;
  source?: string;
  skipped?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardTitle className="mb-3 flex items-center">
        {title}
        <SourceTag source={source} />
      </CardTitle>
      {skipped ? (
        <p className="text-sm italic text-slate-500">Skipped by the supervisor for this bug.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-4">{children}</dl>
      )}
    </Card>
  );
}

function ConfidenceBar({ value, color = "bg-indigo-500" }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

const SEVERITY_BAR_COLOR: Record<Severity, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

export function BugResult() {
  const { id } = useParams<{ id: string }>();
  const bugId = Number(id);

  const { data: bug, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["bug", bugId],
    queryFn: () => api.getBug(bugId),
    enabled: Number.isFinite(bugId),
  });

  if (isLoading) return <LoadingState message="Loading bug…" />;

  if (isError || !bug) {
    return (
      <div className="px-6 py-16">
        <ErrorState
          message={error instanceof Error ? error.message : "Could not load this bug."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> All bugs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{bug.title}</h1>
          {bug.decision && <SeverityBadge label={bug.decision.severity} />}
          {bug.decision && <PriorityBadge priority={bug.decision.priority} />}
          {bug.short_circuit && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Short-circuited
            </span>
          )}
          <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {bug.mode}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">{bug.description}</p>
        {bug.stack_trace && (
          <pre className="mt-3 max-w-2xl overflow-x-auto rounded-lg bg-black/40 px-4 py-3 text-xs text-slate-200">
            {bug.stack_trace}
          </pre>
        )}
      </div>

      {bug.decision && (
        <Card className="border-indigo-500/30 bg-indigo-500/5">
          <CardTitle className="mb-3 flex items-center text-indigo-400">
            Final recommendation
            <SourceTag source={bug.decision.explanation_source} />
          </CardTitle>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Priority" value={bug.decision.priority} />
            <Field label="Target release" value={bug.decision.target_release} />
            <Field label="Team" value={bug.decision.team} />
            <Field label="ETA" value={bug.decision.estimated_resolution} />
          </dl>
          <p className="mt-4 text-sm text-slate-300">{bug.decision.explanation}</p>
        </Card>
      )}

      <div className="space-y-4">
        <AgentTraceStepper trace={bug.execution_trace} />
        {bug.supervisor_reason && (
          <blockquote className="card border-l-4 border-l-indigo-500 px-5 py-4 text-sm italic text-slate-400">
            “{bug.supervisor_reason}”
          </blockquote>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <SectionCard title="Analysis" source={bug.analysis?.source} skipped={!bug.analysis}>
          {bug.analysis && (
            <>
              <Field label="Category" value={bug.analysis.category} />
              <Field label="Module" value={bug.analysis.module} />
              <Field label="Nature" value={bug.analysis.nature} />
              <Field label="Possible cause" value={bug.analysis.possible_cause} />
            </>
          )}
        </SectionCard>

        <SectionCard title="Duplicate check" source={bug.duplicate?.match_source ?? undefined} skipped={!bug.duplicate}>
          {bug.duplicate && (
            <>
              <Field label="Is duplicate" value={bug.duplicate.is_duplicate ? "Yes" : "No"} />
              <Field label="Possible duplicate" value={bug.duplicate.possible_duplicate ? "Yes" : "No"} />
              <Field label="Similarity score" value={bug.duplicate.score.toFixed(3)} />
              <Field label="Closest match" value={bug.duplicate.match_title} />
              {bug.duplicate.top_matches.length > 0 && (
                <div className="col-span-2">
                  <dt className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    Top similar bugs
                  </dt>
                  <ul className="space-y-1">
                    {bug.duplicate.top_matches.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate text-slate-300">
                          <span className="text-slate-500">#{m.id}</span> {m.title}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500">{m.score.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </SectionCard>

        <SectionCard title="Severity" source={bug.severity?.source} skipped={!bug.severity}>
          {bug.severity && (
            <div className="col-span-2 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence</dt>
                  <dd className="text-sm text-slate-200">{Math.round(bug.severity.confidence * 100)}%</dd>
                </div>
                <div className="mt-1.5">
                  <ConfidenceBar value={bug.severity.confidence} />
                </div>
                <div className="mt-3">
                  <SeverityBadge label={bug.severity.label} />
                </div>
              </div>
              <div className="space-y-1.5">
                {(Object.entries(bug.severity.probabilities) as [Severity, number][])
                  .sort((a, b) => b[1] - a[1])
                  .map(([label, prob]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs text-slate-500">{label}</span>
                      <div className="flex-1">
                        <ConfidenceBar value={prob} color={SEVERITY_BAR_COLOR[label]} />
                      </div>
                      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-slate-500">
                        {Math.round(prob * 100)}%
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Assignment" source={bug.assignment?.matched_on} skipped={!bug.assignment}>
          {bug.assignment && (
            <>
              <Field label="Team" value={bug.assignment.team} />
              <Field label="Rule" value={bug.assignment.rule} />
            </>
          )}
        </SectionCard>
      </div>

      {bug.errors.length > 0 && (
        <div className="rounded-lg border border-orange-900/50 bg-orange-950/30 px-4 py-3 text-sm text-orange-400">
          {bug.errors.join(" · ")}
        </div>
      )}

      <p className="text-xs text-slate-600">
        {bug.metrics.agents_run} of 6 agents ran · {bug.metrics.total_ms} ms total
        {bug.metrics.llm_calls > 0 && ` · ${bug.metrics.llm_calls} LLM call${bug.metrics.llm_calls === 1 ? "" : "s"} · ${bug.metrics.tokens} tokens`}
      </p>
    </div>
  );
}
