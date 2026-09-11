import { useMutation } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { api } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { PriorityBadge } from "../components/PriorityBadge";
import { Button } from "../components/ui/Button";
import { Card, CardTitle } from "../components/ui/Card";
import type { BugState } from "../types/bug";

const TITLE_MIN = 10;
const DESCRIPTION_MIN = 20;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

function ModeColumn({ label, bug }: { label: string; bug: BugState }) {
  return (
    <Card>
      <CardTitle className="mb-4 flex items-center justify-between">
        <span>{label}</span>
        {bug.decision && <PriorityBadge priority={bug.decision.priority} />}
      </CardTitle>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Agents run</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-indigo-400">{bug.metrics.agents_run}/6</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total time</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-200">{bug.metrics.total_ms} ms</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">LLM calls</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-200">{bug.metrics.llm_calls}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tokens</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-200">{bug.metrics.tokens}</dd>
        </div>
      </dl>
    </Card>
  );
}

function savedColor(n: number): string {
  return n > 0 ? "text-emerald-400" : n < 0 ? "text-amber-400" : "text-slate-400";
}

function MatchLine({ label, match }: { label: string; match: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-sm ${match ? "text-emerald-400" : "text-amber-400"}`}>
      {match ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function Compare() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [environment, setEnvironment] = useState("");
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({ mutationFn: api.compare });

  const titleError = touched && title.trim().length < TITLE_MIN;
  const descriptionError = touched && description.trim().length < DESCRIPTION_MIN;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (title.trim().length < TITLE_MIN || description.trim().length < DESCRIPTION_MIN) return;

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      stack_trace: stackTrace.trim() || undefined,
      environment: environment.trim() || undefined,
    });
  }

  const result = mutation.data;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Adaptive vs. static comparison</h1>
      <p className="text-sm text-slate-400">
        Submit one bug and run it through both routing modes to see how much work adaptive routing actually saves.
        This runs as a research ablation — it isn't saved as a real bug and won't affect duplicate detection.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-300">
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short, specific summary"
            maxLength={300}
            className={inputClass}
          />
          {titleError && (
            <p className="mt-1 text-xs text-red-400">Title needs at least {TITLE_MIN} characters.</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-300">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What happened, what did you expect instead, steps to reproduce"
            maxLength={10000}
            className={inputClass}
          />
          {descriptionError && (
            <p className="mt-1 text-xs text-red-400">Description needs at least {DESCRIPTION_MIN} characters.</p>
          )}
        </div>

        <div>
          <label htmlFor="stack" className="block text-sm font-medium text-slate-300">
            Stack trace <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <textarea
            id="stack"
            value={stackTrace}
            onChange={(e) => setStackTrace(e.target.value)}
            rows={2}
            placeholder="Paste a traceback if you have one"
            maxLength={20000}
            className={`${inputClass} font-mono text-xs`}
          />
        </div>

        <div>
          <label htmlFor="environment" className="block text-sm font-medium text-slate-300">
            Environment <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            placeholder="e.g. prod, Chrome 128"
            maxLength={500}
            className={inputClass}
          />
        </div>

        {mutation.isError && (
          <ErrorState
            message={mutation.error instanceof Error ? mutation.error.message : "Comparison failed."}
            onRetry={() => mutation.reset()}
          />
        )}

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          Run in both modes
        </Button>
      </form>

      {mutation.isPending && <LoadingState message="Running adaptive and static side by side…" />}

      {result && (
        <div className="space-y-4">
          <Card className="border-indigo-500/30 bg-indigo-500/5">
            <CardTitle className="mb-3 text-indigo-400">What adaptive saved</CardTitle>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Agents saved</dt>
                <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${savedColor(result.summary.agents_saved)}`}>
                  {result.summary.agents_saved}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Time saved</dt>
                <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${savedColor(result.summary.time_saved_ms)}`}>
                  {result.summary.time_saved_ms} ms
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">LLM calls saved</dt>
                <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${savedColor(result.summary.llm_calls_saved)}`}>
                  {result.summary.llm_calls_saved}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Tokens saved</dt>
                <dd className={`mt-0.5 text-lg font-semibold tabular-nums ${savedColor(result.summary.tokens_saved)}`}>
                  {result.summary.tokens_saved}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800 pt-4">
              <MatchLine label="Same priority" match={result.summary.same_priority} />
              <MatchLine label="Same severity" match={result.summary.same_severity} />
              <MatchLine label="Same team" match={result.summary.same_team} />
            </div>
          </Card>

          <div className="grid gap-5 sm:grid-cols-2">
            <ModeColumn label="Adaptive" bug={result.adaptive} />
            <ModeColumn label="Static" bug={result.static} />
          </div>
        </div>
      )}
    </div>
  );
}
