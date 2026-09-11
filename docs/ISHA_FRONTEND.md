# Isha — Frontend Guide

## Setup
```
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom recharts lucide-react framer-motion clsx
```
Use shadcn/ui (ui.shadcn.com) for cards, buttons, tables, badges.
Mock data: `contracts/api_sample.json`. API URL in `.env` as `VITE_API_URL` (real URL ~11am).

## Pages
1. **Submit Bug** — title, description, stack trace, environment → `POST /api/bugs`
2. **Result**
   - Top: big recommendation card — priority, severity, team, action, target release, explanation
   - Middle: **agent path view** (most important — our novelty)
     - 6 nodes: Supervisor → Bug Analysis → Duplicate → Severity → Assignment → Decision
     - Ran = solid indigo + ✓ + ms · Skipped = grey dashed "skipped" · Failed = red ⚠
     - Data from `execution_trace`; animate nodes lighting up one by one
     - Show `supervisor_reason` below in a quote box
   - Bottom: 2×2 cards — Analysis, Duplicate, Severity (confidence bar), Assignment
3. **Dashboard** (`GET /api/stats`) — 4 stat cards (Total, Critical, High, Duplicates), donut by severity, bars by category + team, recent bugs table
4. **History** (`GET /api/bugs`) — table, row click → result page, empty state when no bugs
5. Loading: skeletons + "Analyzing with 6 agents…" (takes 5–10 s). Error message if API fails.
6. Left sidebar: app name + Submit / Dashboard / History

## Design
- Dark theme: bg `slate-950`, cards `slate-900`, borders `slate-800`, text `slate-100` / `slate-400`
- One accent: `indigo-500`
- Severity: Critical red-500 · High orange-500 · Medium yellow-500 · Low green-500
- Priority badges: P1 red · P2 orange · P3 yellow · P4 slate
- `rounded-xl`, `p-6`, `max-w-6xl`, Inter font, hover states on cards/rows
- Don't: multiple accent colors, gradients everywhere, landing page, light mode

## Deadlines
- **1am:** Submit + Result pages on mock data
- **1pm:** all pages on real API, deployed to Vercel
