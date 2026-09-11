# Backend — Adaptive Multi-Agent Bug Intelligence

## Run locally (Windows PowerShell, from `backend/`)
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m app.ml.train_severity     # trains severity_model.pkl + reports/
python -m app.db.seed               # creates tables + historical bugs (SQLite locally)
uvicorn app.main:app --reload       # http://127.0.0.1:8000/docs
```
Put `GOOGLE_API_KEY=...` in the repo-root `.env`. Without a key everything still works using rule-based fallbacks.

## Structure
```
app/
  config.py            all settings (model, temperature, thresholds, seeds)
  llm.py               Gemini wrapper (JSON output, usage tracking, never raises)
  knowledge.py         modules → teams → keywords (overridden by data/module_team_map.csv)
  graph/
    graph.py           LangGraph StateGraph + adaptive routing (next_step)
    supervisor.py      Supervisor Agent — picks agents (Gemini, rule fallback)
    bug_analysis.py    Bug Analysis Agent — category/module/cause (Gemini, rule fallback)
    ml_agents.py       Duplicate / Severity / Assignment agents
    engineering_decision.py  rules for priority/release + Gemini explanation
    common.py          node wrapper: timing, tokens, fault tolerance
    serialize.py       API response shape
  ml/
    train_severity.py  TF-IDF + Logistic Regression training + metrics
    severity.py        inference (keyword fallback if no model)
    duplicate.py       TF-IDF cosine duplicate index
    assignment.py      module → team rules
  db/
    database.py        SQLAlchemy models (7 tables)
    repository.py      reads/writes for the API
    seed.py            tables + seed data
  main.py              FastAPI routes
scripts/evaluate.py    ablation: adaptive vs static → reports/
```

## API
- `POST /api/bugs` `{title, description, stack_trace?, environment?, mode?: "adaptive"|"static"}`
- `GET /api/bugs` · `GET /api/bugs/{id}` · `GET /api/stats` (incl. `by_mode`, `comparisons`) · `GET /api/teams` · `GET /health`
- `POST /api/compare` `{title, description, stack_trace?}` → runs adaptive + static on the same bug → `{adaptive, static, summary}` (saved to `comparisons`, not to bugs)
- `GET /api/comparisons` → all past comparisons with savings

Response shape: `contracts/samples/*.json` (full path, light path, duplicate path).

## Research
- `mode=static` runs every agent on every bug (baseline); `adaptive` lets the Supervisor choose.
- Every agent logs ms, LLM calls and tokens → `agent_results`, `processing_history`.
- `python -m scripts.evaluate ../data/test_bugs.csv` → `reports/ablation_summary.json`
- `data/bootstrap_bugs.csv` is a 60-row DEV-ONLY set. Replace with the real dataset (`data/severity_dataset.csv`) and retrain before reporting any numbers.
