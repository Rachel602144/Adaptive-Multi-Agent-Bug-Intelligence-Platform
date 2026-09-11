# Task Split — Demo: 12 Sept EOD
Rule: edit ONLY your own folders · `contracts/` changes only after telling the group · Check-ins: 1am, 9am, 1pm, 4pm · Stuck >30 min → tell the group · **Feature freeze: 1pm, 12 Sept**

| Person | Area |
|---|---|
| Rachel | Entire backend — agents, ML model, database, API, deploy, integration |
| Isha | Entire frontend — UI, dashboard, deploy |
| Khushi | Data, evaluation, testing, report, slides, demo |

## Rachel — Backend (`backend/`, `contracts/`)
**1. LangGraph orchestration**
- Flow: `supervisor → bug_analysis → [duplicate?] → [severity?] → [assignment?] → engineering_decision`, conditional edges from Supervisor's `selected_agents`
- Duplicate short-circuit: similarity > 0.85 → skip Severity + Assignment, inherit from original bug
- Every node logs to `execution_trace` (ran / skipped / failed + ms) and has try/except fallback (fault tolerance)

**2. Agents**
- **Supervisor** — Gemini picks agents + reason; rule fallback (stack trace / 500 / auth / payment → full path; UI / typo / CSS → light path)
- **Bug Analysis** — Gemini → category, module, nature, possible cause, technical info; keyword fallback
- **Duplicate** — TF-IDF cosine similarity vs historical bugs · **Severity** — trained model → label + confidence
- **Assignment** — module → team rules · **Engineering Decision** — rules for priority (P1–P4), release, ETA; Gemini explanation; template fallback

**3. ML** — `train_severity.py`: TF-IDF (1–2 grams) + Logistic Regression (balanced), 80/20 stratified → `severity_model.pkl` + accuracy, macro-F1, confusion matrix
**4. Database** — bugs, historical_bugs, modules, teams, agent_results, recommendations, processing_history + seed data
**5. API** — `POST /api/bugs` (save → run graph → save results → return state), `GET /api/bugs`, `/api/bugs/{id}`, `/api/stats`, `/api/teams`, `/health`
**6. Deploy** — Neon + Render; merge Isha's frontend; run 3 demo bugs after every merge; latency per path
**7. Research-ready** — `mode` switch (adaptive vs static) for ablation · log latency, LLM calls, tokens per agent · fixed model, temperature 0, fixed seeds · `evaluate.py` runs a bug CSV through both modes

**By 1am:** graph runs end-to-end · **11am:** real API live · **1pm:** deployed

## Isha — Frontend (`frontend/`)
Build against `contracts/api_sample.json` until the real API is live — don't wait for backend.
1. Vite + React + TypeScript + Tailwind setup
2. **Submit Bug** — title, description, stack trace, environment
3. **Result page** — **agent path view** (6 agents: ran / skipped / failed — our novelty, make it obvious) + analysis, duplicate, severity, assignment, final recommendation cards
4. **Dashboard** — total, critical/high, duplicates + charts by severity / category / team
5. **History** — all bugs, click → result page
6. Loading (5–10 s) + error states; API URL in `VITE_API_URL`
7. Deploy to Vercel

**By 1am:** Submit + Result on mock data · **1pm:** all pages on real API, deployed

## Khushi — Data, Evaluation, Report (`data/`, `docs/`)
**1. Severity dataset (first priority tonight)**
- Real Eclipse / Mozilla Bugzilla data (Kaggle, GitHub), ~2,000+ rows · no AI-generated data · save source + citation
- Prefer a dataset with duplicate links (used for duplicate evaluation)
- Map: blocker, critical → Critical · major → High · normal → Medium · minor, trivial → Low · drop enhancement
- Clean empty / duplicate / non-English rows → `data/severity_dataset.csv` (`title, description, severity`); note class counts

**2. Module → team map** — 8–10 modules (Authentication, Payment, UI, Database, API, …), each with team + keywords → `data/module_team_map.csv`
**3. Test bugs** — 3 demo bugs (UI typo · HTTP 500 after password reset · "Authentication failure after password reset") + 15 test bugs with expected severity, team, path → `data/test_bugs.csv`
**4. Duplicate pairs** — 10 real duplicates + 10 similar-but-different → `data/duplicate_pairs.csv`; compute precision / recall
**5. Evaluation** — screenshots of accuracy, F1, confusion matrix; expected vs actual table for all 18 bugs; latency per path
**6. Testing** — edge cases on the live app (empty fields, long text, gibberish); report issues with screenshots
**7. Report** — Problem, Related work, Architecture, Implementation, Results, Limitations, Future work
**8. Slides + demo** — 8–10 slides; 5-min demo script (who clicks what, which bug, what to say)

## Research Paper Track (after the demo)
1. **Ablation:** adaptive vs static — latency, LLM calls/tokens, accuracy (main result)
2. **Severity baselines:** Logistic Regression vs Naive Bayes vs SVM vs zero-shot Gemini
3. **Duplicate evaluation:** hundreds of real duplicate pairs — precision / recall / F1
4. **Related work:** extend the 10 papers from review 2
5. **Venue:** realistic conference / workshop; **AI-use disclosure** as required

## Everyone — 1pm to 6pm, 12 Sept
- Run 3 demo bugs: UI typo (light path) · HTTP 500 (full path) · duplicate auth bug (short-circuit)
- 1-hour code walkthrough together
- **Everyone must be able to explain the agents, model and UI in the viva**
