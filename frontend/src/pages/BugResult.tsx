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

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-200">{value ?? "—"}</dd>
    </div>
  );
}

function SectionCard({ title, skipped, children }: { title: string; skipped?: boolean; children: React.ReactNode }) {
  return (
    <Card>
      <CardTitle className="mb-3">{title}</CardTitle>
      {skipped ? (
        <p className="text-sm italic text-slate-500">Skipped by the supervisor for this bug.</p>
      ) : (
        <dl className="grid grid-cols-2 gap-4">{children}</dl>
      )}
    </Card>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.round(value * 100)}%` }} />
    </div>
  );
}

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

  const ranCount = bug.execution_trace.filter((t) => t.status !== "skipped").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <div>
        <Link to="/history" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> All bugs
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-white">{bug.title}</h1>
          {bug.severity && <SeverityBadge label={bug.severity.label} />}
          {bug.decision && <PriorityBadge priority={bug.decision.priority} />}
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
          <CardTitle className="mb-3 text-indigo-400">Final recommendation</CardTitle>
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
        <SectionCard title="Analysis" skipped={!bug.analysis}>
          {bug.analysis && (
            <>
              <Field label="Category" value={bug.analysis.category} />
              <Field label="Module" value={bug.analysis.module} />
              <Field label="Nature" value={bug.analysis.nature} />
              <Field label="Possible cause" value={bug.analysis.possible_cause} />
            </>
          )}
        </SectionCard>

        <SectionCard title="Duplicate check" skipped={!bug.duplicate}>
          {bug.duplicate && (
            <>
              <Field label="Is duplicate" value={bug.duplicate.is_duplicate ? "Yes" : "No"} />
              <Field label="Similarity score" value={bug.duplicate.score.toFixed(2)} />
              <Field label="Closest match" value={bug.duplicate.match_title} />
              <Field label="Match ID" value={bug.duplicate.match_id} />
            </>
          )}
        </SectionCard>

        <SectionCard title="Severity" skipped={!bug.severity}>
          {bug.severity && (
            <div className="col-span-2">
              <div className="flex items-center justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Confidence</dt>
                <dd className="text-sm text-slate-200">{Math.round(bug.severity.confidence * 100)}%</dd>
              </div>
              <ConfidenceBar value={bug.severity.confidence} />
              <div className="mt-4">
                <SeverityBadge label={bug.severity.label} />
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Assignment" skipped={!bug.assignment}>
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

      <p className="text-xs text-slate-600">{ranCount} of 6 agents ran for this bug.</p>
    </div>
  );
}
