# Task Split — Demo: 12 Sept EOD

Rule: edit ONLY your own folders. Shared files in `contracts/` change only after telling the group.
Check-ins (5 min call): 1am, 9am, 1pm, 4pm. Stuck >30 min → say it in the group.
**Feature freeze: 1pm, 12 Sept.**

---

## Rachel — Agents, API, Integration (lead)
Folders: `backend/app/graph/`, `backend/app/main.py`

1. LangGraph graph using `contracts/state.py` (stub nodes first, runs end-to-end)
2. Supervisor Agent — Gemini structured output → `selected_agents` + reason; rule-based fallback
3. Bug Analysis Agent — Gemini → category, module, nature, possible_cause, technical_info
4. Engineering Decision Agent — rules for priority/release/ETA, Gemini for explanation, template fallback
5. Duplicate short-circuit: score > 0.85 → skip severity + assignment
6. `execution_trace` for every agent (ran / skipped / failed + ms)
7. FastAPI routes wired to graph + DB; merge teammates' work; run 3 demo bugs after every merge
8. Backend deploy (Render) + DB (Neon)

**By 1am:** graph runs end-to-end with stubs. **By 1pm:** real agents + API live.

---

## Khushi — Data, ML, Database
Folders: `backend/app/ml/`, `backend/app/db/`
**Do NOT change function signatures in `ml/interfaces.py`.**

1. Dataset: find labeled bug-severity data (Eclipse/Mozilla Bugzilla, Kaggle) → map to Critical/High/Medium/Low. Fallback: Gemini-generated, clearly labeled synthetic
2. `train_severity.py` — TF-IDF + Logistic Regression, 80/20 split → save `severity_model.pkl`, print accuracy + F1 + confusion matrix (**screenshot this for the report**)
3. `predict_severity(text)` → `{label, confidence}`
4. `schema.sql` — tables: bugs, historical_bugs, modules, teams, agent_results, recommendations, processing_history
5. `seed.py` — 200–500 historical bugs + module→team mappings
6. `detect_duplicate(title, desc)` — TF-IDF cosine vs historical_bugs → `{is_duplicate, match_id, match_title, score}`
7. `assign_team(module, category)` — rule table (Authentication→Backend, Payment UI→Frontend, …) → `{team, rule}`
8. Label ~20 bug pairs as duplicate / not → duplicate precision number for the report

**By 1am:** model trained + schema done. **By 11am:** all 3 functions working, DB seeded.

---

## Isha — Frontend
Folder: `frontend/`
Build against `contracts/api_sample.json` until the real API is live — do not wait for backend.

1. Vite + React + TypeScript + Tailwind setup
2. Submit Bug page — title, description, stack trace, environment
3. Result page — **agent path view** (6 agents shown as ran / skipped / failed — this is our novelty, make it obvious), then analysis, duplicate, severity, assignment, final recommendation card
4. Dashboard — total bugs, critical/high count, duplicates, charts by severity / category / team
5. History table — all bugs, click → result page
6. Loading state (triage takes ~5–10 s) + error state
7. Swap mock → real API URL (env var `VITE_API_URL`) at 11am
8. Deploy to Vercel

**By 1am:** form + result page on mock data. **By 1pm:** all pages on real API.

---

## Everyone — 1pm to 6pm, 12 Sept
- Test the 3 demo bugs: UI typo (short path), HTTP 500 after password reset (full path), duplicate auth bug (short-circuit)
- Report/slides: each person writes the part they built + metrics
- **Each person must be able to explain their own part in the viva.**
