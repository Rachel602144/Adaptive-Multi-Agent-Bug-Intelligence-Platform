# Bug Intelligence Platform — Frontend

The web client for the Adaptive Multi-Agent Bug Intelligence Platform. It lets a user submit a bug report, watches the backend's Supervisor agent decide which of six specialist agents actually need to run, and shows the resulting triage recommendation — plus dashboards and tooling for evaluating the adaptive routing itself against a static baseline.

This is a pure client: all triage logic, the LangGraph pipeline, the trained severity model, and persistence live in `../backend`. There is no mock mode — the backend must be running for any page to show data.

## Features

- **Submit Bug** — a report form with live character counts and progressive disclosure for optional fields (stack trace, environment), plus a routing-mode toggle (adaptive vs. static)
- **Supervisor Decision panel** — an animated, per-bug visualization of which of the six agents ran, skipped, or failed, with the real reason for each skip and a path badge (light / full / duplicate short-circuit) computed from the actual response, never hardcoded
- **Result page** — the full triage output: analysis, duplicate matches, severity confidence breakdown, team assignment, and the final recommendation, each tagged with whether it came from the LLM, a trained model, or a rule-based fallback
- **Dashboard** — aggregate stats, severity/category/team charts, an agent-usage chart, and a headline finding comparing adaptive routing against the static baseline
- **Compare** — run one bug through both routing modes side by side and see the exact agents/time/LLM-calls/tokens saved
- **History** — every submitted bug, filterable by severity, with CSV export
- **Live status indicator** — the sidebar shows in real time whether the backend is actually using the LLM or running on rule-based fallback

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) — dev server and build
- [Tailwind CSS v4](https://tailwindcss.com/) — styling
- [React Router](https://reactrouter.com/) — client-side routing
- [TanStack Query](https://tanstack.com/query) — server-state fetching and caching
- [Recharts](https://recharts.org/) — charts
- [Framer Motion](https://www.framer.com/motion/) — animation
- [Lucide](https://lucide.dev/) — icons

## Installation

```bash
git clone https://github.com/Rachel602144/Adaptive-Multi-Agent-Bug-Intelligence-Platform.git
cd Adaptive-Multi-Agent-Bug-Intelligence-Platform/frontend
npm install
```

## Configuration

```bash
cp .env.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Base URL of the FastAPI backend |

## Running locally

Start the backend first (see `../backend/README.md`), then:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
  api/          Typed fetch client for the backend
  components/   Shared UI (Supervisor Decision panel, badges, sidebar, ui/ primitives)
  pages/        SubmitBug, BugResult, Dashboard, History, Compare
  types/        BugState / BugSummary / stats types mirroring the backend contract
  lib/          Small utilities (CSV export)
```

## Pages

| Route | Purpose |
|---|---|
| `/` | Submit a bug and trigger the agent pipeline |
| `/bugs/:id` | Supervisor Decision panel + full triage result |
| `/dashboard` | Aggregate stats, charts, and the adaptive-vs-static headline finding |
| `/history` | All submitted bugs, filterable, with CSV export |
| `/compare` | Run one bug through adaptive and static mode side by side |

## Deployment (Vercel)

1. `vercel.json` already includes the SPA rewrite needed for client-side routing.
2. Set `VITE_API_URL` in the Vercel project's environment variables to the deployed backend's URL.
3. Deploy with `vercel --prod` from this folder, or connect the repo in the Vercel dashboard with root directory set to `frontend`.
