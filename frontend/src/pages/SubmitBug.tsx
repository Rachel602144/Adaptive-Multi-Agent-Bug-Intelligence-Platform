import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Button } from "../components/ui/Button";
import type { Mode } from "../types/bug";

const DEMO_BUGS = [
  {
    label: "UI typo (light path)",
    title: "Typo on settings page",
    description: "The 'Save Changess' button label has an extra 's'.",
    stack_trace: "",
    environment: "prod, Chrome 128",
  },
  {
    label: "HTTP 500 after password reset (full path)",
    title: "HTTP 500 after password reset",
    description: "Users get a 500 error when logging in right after resetting their password.",
    stack_trace: "Traceback ... auth/service.py line 88 in verify_token ... KeyError: 'reset_ts'",
    environment: "prod, Chrome 128",
  },
  {
    label: "Duplicate auth bug (short-circuit)",
    title: "Authentication failure after password reset",
    description: "Users get a 500 error when logging in right after resetting their password.",
    stack_trace: "",
    environment: "prod, Safari 17",
  },
];

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

export function SubmitBug() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stackTrace, setStackTrace] = useState("");
  const [environment, setEnvironment] = useState("");
  const [mode, setMode] = useState<Mode>("adaptive");
  const [touched, setTouched] = useState(false);

  const mutation = useMutation({
    mutationFn: api.submitBug,
    onSuccess: (bug) => navigate(`/bugs/${bug.bug_id}`),
  });

  const TITLE_MIN = 10;
  const DESCRIPTION_MIN = 20;

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
  }

  if (mutation.isPending) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <LoadingState message="Running multi-agent triage…" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold text-white">Report a bug</h1>
      <p className="mt-1 text-sm text-slate-400">
        The supervisor agent reads this and decides which downstream agents actually run.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {DEMO_BUGS.map((demo) => (
          <button
            key={demo.label}
            type="button"
            onClick={() => fillDemo(demo)}
            className="rounded-full border border-slate-700 px-3 py-1 text-xs font-medium text-slate-400 transition hover:border-indigo-500 hover:text-indigo-400"
          >
            Fill: {demo.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="card mt-4 space-y-5 p-6">
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
            <p className="mt-1 text-xs text-red-400">
              {title.trim().length === 0
                ? "Title is required."
                : `Title needs at least ${TITLE_MIN} characters — "trial 2" or "bla bla" isn't enough to triage.`}
            </p>
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
            rows={4}
            placeholder="What happened, what did you expect instead, steps to reproduce"
            maxLength={10000}
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
          <label htmlFor="stack" className="block text-sm font-medium text-slate-300">
            Stack trace <span className="font-normal text-slate-500">(optional)</span>
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

        <Button type="submit" className="w-full">
          Run triage
        </Button>
      </form>
    </div>
  );
}
