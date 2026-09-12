import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Brain,
  ChevronDown,
  ClipboardCheck,
  Copy,
  SendHorizonal,
  Sparkles,
  TriangleAlert,
  Type,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Card, CardTitle } from "../components/ui/Card";
import type { Mode } from "../types/bug";

type PathKind = "light" | "full" | "duplicate";

const PATH_STYLE: Record<PathKind, { icon: typeof Type; text: string; ring: string; hoverBorder: string }> = {
  light: { icon: Type, text: "text-green-400", ring: "bg-green-500/10", hoverBorder: "hover:border-green-500/60" },
  full: { icon: TriangleAlert, text: "text-indigo-400", ring: "bg-indigo-500/10", hoverBorder: "hover:border-indigo-500/60" },
  duplicate: { icon: Copy, text: "text-amber-400", ring: "bg-amber-500/10", hoverBorder: "hover:border-amber-500/60" },
};

const DEMO_BUGS: {
  label: string;
  kind: PathKind;
  title: string;
  description: string;
  stack_trace: string;
  environment: string;
}[] = [
  {
    label: "UI typo",
    kind: "light",
    title: "Typo on settings page",
    description: "The 'Save Changess' button label has an extra 's'.",
    stack_trace: "",
    environment: "prod, Chrome 128",
  },
  {
    label: "HTTP 500 after password reset",
    kind: "full",
    title: "HTTP 500 after password reset",
    description: "Users get a 500 error when logging in right after resetting their password.",
    stack_trace: "Traceback ... auth/service.py line 88 in verify_token ... KeyError: 'reset_ts'",
    environment: "prod, Chrome 128",
  },
  {
    label: "Duplicate auth bug",
    kind: "duplicate",
    title: "Authentication failure after password reset",
    description: "Users get a 500 error when logging in right after resetting their password.",
    stack_trace: "",
    environment: "prod, Safari 17",
  },
];

const HOW_IT_WORKS = [
  { icon: SendHorizonal, title: "You describe the bug", body: "Title, description, and a stack trace if you have one." },
  { icon: Brain, title: "The Supervisor decides", body: "It picks only the agents this specific bug needs." },
  { icon: ClipboardCheck, title: "You get a recommendation", body: "Priority, team, release target, and why." },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

const TITLE_MIN = 10;
const DESCRIPTION_MIN = 20;
const TITLE_MAX = 300;
const DESCRIPTION_MAX = 10000;

function CharCount({ value, max }: { value: string; max: number }) {
  return <span className="text-[11px] tabular-nums text-slate-600">{value.trim().length}/{max}</span>;
}

function LiveSnapshot() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: api.getStats, staleTime: 10_000 });

  return (
    <Card>
      <CardTitle className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-400" strokeWidth={2} />
        Live snapshot
      </CardTitle>
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-slate-500">Bugs triaged</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">{stats?.total ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Avg. latency</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">
            {stats ? `${stats.avg_total_ms} ms` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Duplicates caught</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">{stats?.duplicates ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Historical bugs indexed</dt>
          <dd className="mt-0.5 text-xl font-semibold tabular-nums text-white">
            {stats?.historical_bugs ?? "—"}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function HowItWorks() {
  return (
    <Card>
      <CardTitle className="mb-4">How triage works</CardTitle>
      <ol className="space-y-4">
        {HOW_IT_WORKS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800">
              <step.icon className="h-4 w-4 text-indigo-400" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">
                <span className="mr-1.5 text-slate-600">{i + 1}.</span>
                {step.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function SubmitBug() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [environment, setEnvironment] = useState("");
  const [mode, setMode] = useState<Mode>("adaptive");
  const [touched, setTouched] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mutation = useMutation({
    mutationFn: api.submitBug,
    onSuccess: (bug) => navigate(`/bugs/${bug.bug_id}`),
  });

  const titleTooShort = title.trim().length > 0 && title.trim().length < TITLE_MIN;
  const titleError = touched && (title.trim().length === 0 || titleTooShort);
  const descriptionTooShort = description.trim().length > 0 && description.trim().length < DESCRIPTION_MIN;
  const descriptionError = touched && (description.trim().length === 0 || descriptionTooShort);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (title.trim().length < TITLE_MIN || description.trim().length < DESCRIPTION_MIN) return;

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      stack_trace: stackTrace.trim() || undefined,
      environment: environment.trim() || undefined,
      mode,
    });
  }

  function fillDemo(demo: (typeof DEMO_BUGS)[number]) {
    setTitle(demo.title);
    setDescription(demo.description);
    setStackTrace(demo.stack_trace);
    setEnvironment(demo.environment);
    setTouched(false);
    if (demo.stack_trace) setShowAdvanced(true);
  }

  if (mutation.isPending) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <LoadingState message="Running multi-agent triage…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-400">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
          Adaptive multi-agent triage
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-white">Report a bug</h1>
        <p className="mt-1 text-sm text-slate-400">
          The supervisor agent reads this and decides which downstream agents actually run.
        </p>
      </motion.div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <div className="flex flex-wrap gap-2">
            {DEMO_BUGS.map((demo) => {
              const style = PATH_STYLE[demo.kind];
              return (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => fillDemo(demo)}
                  className={`flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-2 pr-3 text-xs font-medium text-slate-300 transition ${style.hoverBorder} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`}
                >
                  <span className={`flex h-5 w-5 items-center justify-center rounded ${style.ring}`}>
                    <style.icon className={`h-3 w-3 ${style.text}`} strokeWidth={2.5} />
                  </span>
                  {demo.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="card mt-4 space-y-5 p-6">
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="block text-sm font-medium text-slate-300">
                  Title
                </label>
                <CharCount value={title} max={TITLE_MAX} />
              </div>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short, specific summary"
                maxLength={TITLE_MAX}
                className={inputClass}
              />
              {titleError && (
                <p className="mt-1 text-xs text-red-400">
                  {title.trim().length === 0
                    ? "Title is required."
                    : `Title needs at least ${TITLE_MIN} characters — "trial 2" or "bla bla" isn't enough to triage.`}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="description" className="block text-sm font-medium text-slate-300">
                  Description
                </label>
                <CharCount value={description} max={DESCRIPTION_MAX} />
              </div>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="What happened, what did you expect instead, steps to reproduce"
                maxLength={DESCRIPTION_MAX}
                className={inputClass}
              />
              {descriptionError && (
                <p className="mt-1 text-xs text-red-400">
                  {description.trim().length === 0
                    ? "Description is required."
                    : `Description needs at least ${DESCRIPTION_MIN} characters — describe what actually happened.`}
                </p>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                  strokeWidth={2}
                />
                Advanced details <span className="font-normal text-slate-600">(optional)</span>
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-5">
                  <div>
                    <label htmlFor="stack" className="block text-sm font-medium text-slate-300">
                      Stack trace
                    </label>
                    <textarea
                      id="stack"
                      value={stackTrace}
                      onChange={(e) => setStackTrace(e.target.value)}
                      rows={3}
                      placeholder="Paste a traceback if you have one"
                      maxLength={20000}
                      className={`${inputClass} font-mono text-xs`}
                    />
                  </div>

                  <div>
                    <label htmlFor="environment" className="block text-sm font-medium text-slate-300">
                      Environment
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
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Routing mode</label>
              <div className="mt-1.5 flex overflow-hidden rounded-lg border border-slate-700">
                {(["adaptive", "static"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`flex-1 px-3 py-2 text-sm font-medium capitalize transition ${
                      mode === m ? "bg-indigo-500 text-white" : "text-slate-400 hover:bg-slate-900"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {mode === "adaptive"
                  ? "The supervisor decides which agents run."
                  : "Baseline mode — every agent runs on every bug, for comparison."}
              </p>
            </div>

            {mutation.isError && (
              <ErrorState
                message={mutation.error instanceof Error ? mutation.error.message : "Failed to submit bug."}
                onRetry={() => mutation.reset()}
              />
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              <SendHorizonal className="h-4 w-4" strokeWidth={2} />
              Run triage
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
          className="space-y-5 lg:sticky lg:top-6 lg:self-start"
        >
          <LiveSnapshot />
          <HowItWorks />
        </motion.div>
      </div>
    </div>
  );
}
