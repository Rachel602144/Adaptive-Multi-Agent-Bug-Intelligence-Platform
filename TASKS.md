# Task Split — Demo: 12 Sept EOD

Rule: edit ONLY your own folders. Shared files in `contracts/` change only after telling the group.
Check-ins (5 min call): 1am, 9am, 1pm, 4pm. Stuck >30 min → say it in the group.
**Feature freeze: 1pm, 12 Sept.**

| Person | Area |
|---|---|
| Rachel | Entire backend — agents, ML model, database, API, backend deploy, integration |
| Isha | Entire frontend — UI, dashboard, frontend deploy |
| Khushi | Data, evaluation, testing, report, slides, demo |

---

## Rachel — Entire Backend (lead)
Folders: `backend/`, `contracts/`

### 1. LangGraph orchestration — `backend/app/graph/`
- `state.py`: shared `BugState` (from `contracts/state.py`)
- `graph.py`: StateGraph — `START → supervisor → bug_analysis → [duplicate?] → [severity?] → [assignment?] → engineering_decision → END`
- Conditional edges driven by `selected_agents` from the Supervisor
- Duplicate short-circuit: similarity > 0.85 → skip Severity + Assignment, inherit from the original bug
- Every node appends to `execution_trace` → `{agent, status: ran|skipped|failed, ms}`
- Every node wrapped in try/except → on failure, default output + `status: failed`, graph continues (fault tolerance)

### 2. Agents
- **Supervisor** (`supervisor.py`) — Gemini structured output → `{selected_agents, reason}`. Rule fallback: stack trace / 500 / crash / auth / payment / data loss → full path; UI / typo / alignment / CSS → light path
- **Bug Analysis** (`bug_analysis.py`) — Gemini → `{category, module, nature, possible_cause, technical_info}`; parses stack trace; keyword fallback for module
- **Duplicate Detection** (`backend/app/ml/duplicate.py`) — TF-IDF cosine similarity vs `historical_bugs` → `{is_duplicate, match_id, match_title, score}`
- **Severity Prediction** (`backend/app/ml/severity.py`) — loads `severity_model.pkl` → `{label, confidence}`
- **Assignment** (`backend/app/ml/assignment.py`) — module → team rule table from DB → `{team, rule}`
- **Engineering Decision** (`engineering_decision.py`) — rules compute priority (P1–P4), target release (Hotfix / Next / Backlog), estimated resolution; Gemini writes the explanation; template fallback if Gemini fails

### 3. ML pipeline — `backend/app/ml/`
- `train_severity.py`: load Khushi's dataset → clean → TF-IDF (1–2 grams) + Logistic Regression (class_weight=balanced) → 80/20 stratified split
- Output: `severity_model.pkl` + accuracy, macro-F1, confusion matrix image (`reports/`)

### 4. Database — `backend/app/db/`
- `schema.sql`: `bugs`, `historical_bugs`, `modules`, `teams`, `agent_results`, `recommendations`, `processing_history`
- `seed.py`: historical bugs from dataset + module→team mappings + team list
- `db.py`: SQLAlchemy connection from `DATABASE_URL`

### 5. API — `backend/app/main.py`
- `POST /api/bugs` — validate → insert bug → run graph → save agent results + recommendation → return full state
- `GET /api/bugs`, `GET /api/bugs/{id}`, `GET /api/stats`, `GET /api/teams`, `GET /health`
- CORS for the Vercel domain

### 6. Deploy + integration
- DB on Neon, backend on Render, env vars set (`GOOGLE_API_KEY`, `DATABASE_URL`, `FRONTEND_ORIGIN`)
- Merge Isha's frontend; run the 3 demo bugs after every merge
- Measure average latency per path (light / full / duplicate) for the report

**By 1am:** graph runs end-to-end with stub agents. **By 11am:** real API live (Isha switches from mock). **By 1pm:** deployed.

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

## Khushi — Data, Evaluation, Testing, Report, Slides
Put files in `data/` or `docs/`.

### 1. Severity dataset (first priority tonight)
- Find a labeled bug-severity dataset — Eclipse / Mozilla Bugzilla reports (Kaggle, GitHub), minimum ~2,000 rows
- Map original labels → our 4 classes:
  - blocker, critical → **Critical**
  - major → **High**
  - normal → **Medium**
  - minor, trivial → **Low**
  - drop `enhancement` rows
- Clean: remove empty descriptions, duplicates rows, non-English text
- Save as `data/severity_dataset.csv` with columns: `title, description, severity`
- Note class counts (how many Critical/High/Medium/Low) for the report

### 2. Module & team mapping
- Define 8–10 software modules (Authentication, Payment, UI, Database, API, Notifications, Search, Performance, …)
- For each: owning team (Backend / Frontend / Database / DevOps / Security) + 5–10 keywords
- Save as `data/module_team_map.csv` with columns: `module, team, keywords`

### 3. Test & demo bugs
- 3 demo bugs (exact text for the demo):
  - UI typo → should take the light path
  - HTTP 500 after password reset, with stack trace → full path, Critical
  - "Authentication failure after password reset" → duplicate short-circuit
- 15 more test bugs: mix of UI, backend, auth, payment, performance, database
- For each: expected severity, expected team, expected path
- Save as `data/test_bugs.csv`

### 4. Duplicate evaluation set
- 20 bug pairs: 10 real duplicates (same issue, different wording), 10 similar-but-different
- Save as `data/duplicate_pairs.csv` with columns: `bug_a, bug_b, is_duplicate`
- After testing: compute precision / recall of our duplicate agent on these pairs

### 5. Evaluation (after model is trained)
- Screenshot accuracy, macro-F1, confusion matrix
- Run all 18 test bugs through the deployed app → table: expected vs actual severity, team, path
- Record latency per path (light / full / duplicate)

### 6. Testing
- Test the deployed app like a real user: empty fields, very long text, gibberish, no stack trace
- Report anything broken in the group with a screenshot

### 7. Report
- Sections: Problem, Related work (from review 2), Architecture, Implementation, Results/Evaluation, Limitations, Future work
- Results section uses the numbers from step 5
- Limitations must be honest (dataset source, rule-based assignment, LLM dependency)

### 8. Slides + demo script
- 8–10 slides: problem → gap → architecture → adaptive routing → demo → results → limitations
- Demo script: who clicks what, in what order, which bug, what to say (5 minutes max)

---

## Everyone — 1pm to 6pm, 12 Sept
- Test the 3 demo bugs: UI typo (short path), HTTP 500 after password reset (full path), duplicate auth bug (short-circuit)
- 1 hour code walkthrough together
- **Each person must be able to explain the agents, the model and the UI in the viva.**
