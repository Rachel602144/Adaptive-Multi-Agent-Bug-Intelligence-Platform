# Task Split — Demo: 12 Sept EOD

Rule: edit ONLY your own folders. Shared files in `contracts/` change only after telling the group.
Check-ins (5 min call): 1am, 9am, 1pm, 4pm. Stuck >30 min → say it in the group.
**Feature freeze: 1pm, 12 Sept.**

---

## Rachel — Entire backend 
Folders: `backend/`, `contracts/`

1. LangGraph graph + all 6 agents (Supervisor, Bug Analysis, Duplicate, Severity, Assignment, Engineering Decision)
2. Gemini calls with fallbacks; adaptive routing + duplicate short-circuit; `execution_trace`
3. Severity model training script (TF-IDF + Logistic Regression) using Khushi's dataset
4. Duplicate detection, assignment rules, PostgreSQL schema + seed
5. FastAPI routes, backend deploy (Render) + DB (Neon)
6. Merge Isha's frontend; run the 3 demo bugs after every merge

**By 1am:** graph runs end-to-end. **By 11am:** real API live (Isha switches from mock).

---

## Isha — Frontend
Folder: `frontend/`
Build against `contracts/api_sample.json` until the real API is live — do not wait for backend.

1. Vite + React + TypeScript + Tailwind setup
2. Submit Bug page — title, description, stack trace, environment
3. Result page — **agent path view** (6 agents shown as ran / skipped / failed — this is our novelty, make it obvious), then analysis, duplicate, severity, assignment, final recommendation card
4. Dashboard — total bugs, critical/high count, duplicates, charts by severity / category / team (`GET /api/stats`)
5. History table — all bugs, click → result page
6. Loading state (triage takes ~5–10 s) + error state
7. API URL from env var `VITE_API_URL`; swap mock → real API at 11am
8. Deploy to Vercel

**By 1am:** form + result page on mock data. **By 1pm:** all pages on real API, deployed.

---

## Khushi — Data, Evaluation, Report, Slides
No code folders. Send files to Rachel or put them in `data/`.

1. **Tonight, first priority:** find a labeled bug-severity dataset (Eclipse/Mozilla Bugzilla, Kaggle). Send a CSV with columns `title, description, severity` mapped to Critical/High/Medium/Low. Needed by **10pm** — the model depends on it
2. Write 3 demo bug reports + 15 test bugs (mix of UI, backend, auth, payment, duplicates) → `data/test_bugs.csv`
3. Hand-label ~20 bug pairs as duplicate / not duplicate → `data/duplicate_pairs.csv`
4. Once the model is trained: screenshot accuracy, F1, confusion matrix
5. Test the deployed app with the test bugs; report anything broken in the group
6. Report: architecture, implementation, results/evaluation sections
7. Slides + demo script

---

## Everyone — 1pm to 6pm, 12 Sept
- Test the 3 demo bugs: UI typo (short path), HTTP 500 after password reset (full path), duplicate auth bug (short-circuit)
- 1 hour code walkthrough together
- **Each person must be able to explain the agents, the model and the UI in the viva.**
