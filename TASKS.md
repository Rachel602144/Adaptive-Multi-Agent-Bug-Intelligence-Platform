# Task Split — Demo: 12 Sept EOD

Rule: edit ONLY your own folders. `contracts/` changes only after telling the group.
Check-ins (5 min call): 1am, 9am, 1pm, 4pm. Stuck >30 min → say it in the group.
**Feature freeze: 1pm, 12 Sept.**

| Person | Area |
|---|---|
| Rachel | Entire backend — agents, ML model, database, API, deploy, integration |
| Isha | Entire frontend — UI, dashboard, deploy |
| Khushi | Data, evaluation, testing, report, slides, demo |

---

## Rachel — Backend (`backend/`, `contracts/`)

### 1. LangGraph orchestration
- Flow: `supervisor → bug_analysis → [duplicate?] → [severity?] → [assignment?] → engineering_decision`
- Conditional edges driven by the Supervisor's `selected_agents`
- Duplicate short-circuit: similarity > 0.85 → skip Severity + Assignment, inherit from original bug
- Every node logs to `execution_trace` (ran / skipped / failed + ms)
- Every node has try/except → default output, graph continues (fault tolerance)

### 2. Agents
- **Supervisor** — Gemini picks agents + reason. Rule fallback: stack trace / 500 / crash / auth / payment → full path; UI / typo / CSS → light path
- **Bug Analysis** — Gemini → category, module, nature, possible cause, technical info; keyword fallback
- **Duplicate Detection** — TF-IDF cosine similarity vs historical bugs
- **Severity Prediction** — trained model → label + confidence
- **Assignment** — module → team rule table
- **Engineering Decision** — rules for priority (P1–P4), release (Hotfix / Next / Backlog), ETA; Gemini explanation; template fallback

### 3. ML pipeline
- `train_severity.py`: TF-IDF (1–2 grams) + Logistic Regression (balanced), 80/20 stratified split
- Output: `severity_model.pkl` + accuracy, macro-F1, confusion matrix

### 4. Database
- Tables: bugs, historical_bugs, modules, teams, agent_results, recommendations, processing_history
- Seed: historical bugs + module→team mappings

### 5. API
- `POST /api/bugs` — save bug → run graph → save results → return full state
- `GET /api/bugs`, `GET /api/bugs/{id}`, `GET /api/stats`, `GET /api/teams`, `GET /health`

### 6. Deploy + integration
- Neon (DB) + Render (backend); merge Isha's frontend; run 3 demo bugs after every merge
- Measure latency per path (light / full / duplicate)

### 7. Research-ready
- `mode` switch: adaptive vs static (all agents run) → for ablation
- Log latency, LLM calls, tokens per agent; fixed model version, temperature 0, fixed seeds
- `evaluate.py`: runs a CSV of bugs through both modes → results tables

**By 1am:** graph runs end-to-end. **By 11am:** real API live. **By 1pm:** deployed.

---

## Isha — Frontend (`frontend/`)
Build against `contracts/api_sample.json` until the real API is live — don't wait for backend.

1. Vite + React + TypeScript + Tailwind setup
2. **Submit Bug** — title, description, stack trace, environment
3. **Result page** — **agent path view** (6 agents: ran / skipped / failed — our novelty, make it obvious), then analysis, duplicate, severity, assignment, final recommendation card
4. **Dashboard** — total bugs, critical/high, duplicates, charts by severity / category / team
5. **History** — all bugs, click → result page
6. Loading (5–10 s) + error states; API URL in `VITE_API_URL`
7. Deploy to Vercel

**By 1am:** Submit + Result on mock data. **By 1pm:** all pages on real API, deployed.

---

## Khushi — Data, Evaluation, Report (`data/`, `docs/`)

### 1. Severity dataset (first priority tonight)
- Eclipse / Mozilla Bugzilla data (Kaggle, GitHub), ~2,000+ rows
- **Real public data only — no AI-generated data.** Save source link + citation
- Prefer a dataset with **duplicate links** (for duplicate evaluation)
- Map: blocker, critical → **Critical** · major → **High** · normal → **Medium** · minor, trivial → **Low** · drop enhancement
- Clean empty / duplicate / non-English rows → `data/severity_dataset.csv` (`title, description, severity`)
- Note class counts for the report

### 2. Module → team map
- 8–10 modules (Authentication, Payment, UI, Database, API, …), each with team + 5–10 keywords → `data/module_team_map.csv`

### 3. Test & demo bugs
- 3 demo bugs: UI typo (light path) · HTTP 500 after password reset with stack trace (full path, Critical) · "Authentication failure after password reset" (duplicate)
- 15 more test bugs (UI, backend, auth, payment, performance, database), each with expected severity, team, path → `data/test_bugs.csv`

### 4. Duplicate evaluation
- 10 real duplicates + 10 similar-but-different → `data/duplicate_pairs.csv`; compute precision / recall

### 5. Evaluation (after model is trained)
- Screenshots: accuracy, macro-F1, confusion matrix
- All 18 test bugs on the live app → expected vs actual table; latency per path

### 6. Testing
- Edge cases on the live app (empty fields, long text, gibberish, no stack trace); report issues with screenshots

### 7. Report
- Problem, Related work, Architecture, Implementation, Results, Limitations (honest), Future work

### 8. Slides + demo
- 8–10 slides: problem → gap → architecture → adaptive routing → demo → results → limitations
- 5-min demo script: who clicks what, which bug, what to say

---

## Research Paper Track (after the demo)
1. **Ablation:** adaptive vs static — latency, LLM calls/tokens, accuracy (main result)
2. **Severity baselines:** Logistic Regression vs Naive Bayes vs SVM vs zero-shot Gemini
3. **Duplicate evaluation:** hundreds of real duplicate pairs — precision / recall / F1
4. **Related work:** extend the 10 papers from review 2
5. **Venue:** pick a realistic conference / workshop, write to its format
6. **AI-use disclosure** as the venue requires

---

## Everyone — 1pm to 6pm, 12 Sept
- Run the 3 demo bugs: UI typo (light path) · HTTP 500 (full path) · duplicate auth bug (short-circuit)
- 1-hour code walkthrough together
- **Everyone must be able to explain the agents, model and UI in the viva**
