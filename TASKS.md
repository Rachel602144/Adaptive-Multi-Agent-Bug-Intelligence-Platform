# Task Split — Demo: 12 Sept EOD

Rule: edit ONLY your own folders · `contracts/` changes only after telling the group · Check-ins: 1am, 9am, 1pm, 4pm · Stuck >30 min → tell the group · **Feature freeze: 1pm, 12 Sept**

| Person | Area |
|---|---|
| Rachel | Entire backend — agents, ML model, database, API, deploy, integration |
| Isha | Entire frontend — UI, dashboard, deploy |
| Khushi | Data, evaluation, testing, report, slides, demo |

---

## Rachel — Backend (`backend/`, `contracts/`)

**1. LangGraph orchestration**
- Flow: `supervisor → bug_analysis → [duplicate?] → [severity?] → [assignment?] → engineering_decision`, conditional edges from Supervisor's `selected_agents`
- Duplicate short-circuit: similarity > 0.85 → skip Severity + Assignment, inherit from original bug
- Every node logs to `execution_trace` (ran / skipped / failed + ms) and has try/except fallback (fault tolerance)

**Adaptive agent selection (core novelty)**
- Always run: Supervisor, Bug Analysis, Engineering Decision
- Optional (Supervisor chooses any combination): Duplicate, Severity, Assignment → 3 to 6 agents per bug
- Supervisor reads title, description, stack trace → Gemini returns `selected_agents` + reason
- Rule fallback: stack trace / 500 / crash / auth / payment → all optional agents; typo / UI / CSS → none
- Mid-run adaptation: duplicate found (score ≥ 0.75) → skip Severity + Assignment, inherit from original bug
- Static mode (baseline for the paper): every agent runs on every bug
- Output fields: `selected_agents`, `supervisor_reason`, `short_circuit`, `execution_trace`, `metrics.agents_run`

**2. Agents**
- **Supervisor** — Gemini picks agents + reason; rule fallback (stack trace / 500 / auth / payment → full path; UI / typo / CSS → light path)
- **Bug Analysis** — Gemini → category, module, nature, possible cause, technical info; keyword fallback
- **Duplicate** — TF-IDF cosine similarity vs historical bugs
- **Severity** — trained model → label + confidence
- **Assignment** — module → team rules
- **Engineering Decision** — rules for priority (P1–P4), release, ETA; Gemini explanation; template fallback

**3. ML**
- `train_severity.py`: TF-IDF (1–2 grams) + Logistic Regression (balanced), 80/20 stratified split
- Output: `severity_model.pkl` + accuracy, macro-F1, confusion matrix

**4. Database**
- Tables: bugs, historical_bugs, modules, teams, agent_results, recommendations, processing_history + seed data

**5. API**
- `POST /api/bugs` — save → run graph → save results → return state
- `GET /api/bugs`, `/api/bugs/{id}`, `/api/stats`, `/api/teams`, `/health`

**6. Deploy**
- Neon + Render; merge Isha's frontend; run 3 demo bugs after every merge; latency per path

**7. Research-ready**
- `mode` switch (adaptive vs static) for ablation
- Log latency, LLM calls, tokens per agent
- Fixed model, temperature 0, fixed seeds
- `evaluate.py` runs a bug CSV through both modes

**By 1am:** graph runs end-to-end · **11am:** real API live · **1pm:** deployed

---

## Isha — Frontend (`frontend/`)

Build against `contracts/api_sample.json` until the real API is live — don't wait for backend.

1. Vite + React + TypeScript + Tailwind setup
2. **Submit Bug** — title, description, stack trace, environment
3. **Result page — Supervisor Decision panel** (top of page, most visual — our novelty)
   - 6-agent flow: Supervisor → Bug Analysis → Duplicate → Severity → Assignment → Engineering Decision
   - ran = glowing indigo card + check + ms · skipped = grey dashed + reason (`source`) · failed = red
   - Path badge from `metrics.agents_run`: Light (3/6) · Adaptive (4–5/6) · Full (6/6) · Duplicate short-circuit
   - "Why the Supervisor chose this path" card with `supervisor_reason`
   - Stat chips: agents run, total time, LLM calls · staggered framer-motion animation · no emojis
   - Then recommendation card + analysis, duplicate, severity, assignment detail cards
4. **Dashboard** — total, critical/high, duplicates + charts by severity / category / team
5. **History** — all bugs, click → result page
6. Loading (5–10 s) + error states; API URL in `VITE_API_URL`
7. Deploy to Vercel

**By 1am:** Submit + Result on mock data · **1pm:** all pages on real API, deployed

---

## Khushi — Data, Evaluation, Report (`data/`, `docs/`)

**1. Severity dataset (first priority tonight)**
- Real Eclipse / Mozilla Bugzilla data (Kaggle, GitHub), ~2,000+ rows · no AI-generated data · save source + citation
- Prefer a dataset with duplicate links (used for duplicate evaluation)
- Map: blocker, critical → Critical · major → High · normal → Medium · minor, trivial → Low · drop enhancement
- Clean empty / duplicate / non-English rows → `data/severity_dataset.csv` (`title, description, severity`); note class counts

**2. Module → team map**
- 8–10 modules: Authentication, Payment, UI, Database, API, Notifications, Search, Performance, …
- Each with owning team (Backend / Frontend / Database / DevOps / Security) + 5–10 keywords → `data/module_team_map.csv` (`module, team, keywords`)

**3. Test & demo bugs**
- 3 demo bugs: UI typo (light path) · HTTP 500 after password reset with stack trace (full path, Critical) · "Authentication failure after password reset" (duplicate)
- 15 more test bugs (UI, backend, auth, payment, performance, database), each with expected severity, team, path → `data/test_bugs.csv`

**4. Duplicate pairs**
- 10 real duplicates (same issue, different wording) + 10 similar-but-different → `data/duplicate_pairs.csv` (`bug_a, bug_b, is_duplicate`)
- After testing: compute precision / recall of our duplicate agent

**5. Evaluation (after model is trained)**
- Screenshots: accuracy, macro-F1, confusion matrix
- Run all 18 test bugs on the live app → expected vs actual table (severity, team, path); latency per path

**6. Testing**
- Edge cases on the live app (empty fields, very long text, gibberish, no stack trace); report issues in the group with screenshots

**7. Report**
- Problem, Related work (from review 2), Architecture, Implementation, Results (numbers from step 5), Limitations (honest: dataset, rule-based assignment, LLM dependency), Future work

**8. Slides + demo**
- 8–10 slides (problem → gap → architecture → adaptive routing → demo → results → limitations)
- 5-min demo script (who clicks what, which bug, what to say)

---

## Research Paper Track (after the demo)

1. **Ablation:** adaptive vs static — latency, LLM calls/tokens, accuracy (main result)
2. **Severity baselines:** Logistic Regression vs Naive Bayes vs SVM vs zero-shot Gemini
3. **Duplicate evaluation:** hundreds of real duplicate pairs — precision / recall / F1
4. **Related work:** extend the 10 papers from review 2
5. **Venue:** realistic conference / workshop; AI-use disclosure as required

---

## Everyone — 1pm to 6pm, 12 Sept

- Run demo bugs: UI typo (light, 3/6) · refund crash with stack trace (full, 6/6) · same bug again (duplicate short-circuit) · optionally a functional bug with no stack trace (adaptive, 4–5/6)
- 1-hour code walkthrough together
- **Everyone must be able to explain the agents, model and UI in the viva**
