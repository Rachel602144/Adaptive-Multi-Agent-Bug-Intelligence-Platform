# Khushi — Data, Evaluation, Report Guide

## 1. Severity dataset (first priority)
- Source: Eclipse / Mozilla Bugzilla bug reports (Kaggle, GitHub) — at least ~2,000 rows
- Map labels:
  - blocker, critical → **Critical**
  - major → **High**
  - normal → **Medium**
  - minor, trivial → **Low**
  - drop `enhancement`
- Clean: remove empty descriptions, duplicate rows, non-English text
- Save: `data/severity_dataset.csv` — columns `title, description, severity`
- Write down class counts (how many of each) for the report

## 2. Module → team map
- 8–10 modules: Authentication, Payment, UI, Database, API, Notifications, Search, Performance, …
- Each: owning team (Backend / Frontend / Database / DevOps / Security) + 5–10 keywords
- Save: `data/module_team_map.csv` — columns `module, team, keywords`

## 3. Test + demo bugs
- 3 demo bugs (exact text we use in the demo):
  - UI typo → light path
  - HTTP 500 after password reset, with stack trace → full path, Critical
  - "Authentication failure after password reset" → duplicate, skip path
- 15 more: mix of UI, backend, auth, payment, performance, database
- Each: expected severity, expected team, expected path
- Save: `data/test_bugs.csv`

## 4. Duplicate pairs
- 20 pairs: 10 real duplicates (same issue, different words) + 10 similar-but-different
- Save: `data/duplicate_pairs.csv` — columns `bug_a, bug_b, is_duplicate`
- After testing: precision + recall of our duplicate agent

## 5. Evaluation (after model is trained)
- Screenshots: accuracy, macro-F1, confusion matrix
- Run all 18 test bugs on the live app → table: expected vs actual (severity, team, path)
- Latency per path: light / full / duplicate

## 6. Testing
- Edge cases on the live app: empty fields, very long text, gibberish, no stack trace
- Report broken things in the group with a screenshot

## 7. Report
- Sections: Problem · Related work (from review 2) · Architecture · Implementation · Results · Limitations · Future work
- Results use numbers from step 5
- Limitations honestly: dataset source, rule-based assignment, LLM dependency

## 8. Slides + demo
- 8–10 slides: problem → gap → architecture → adaptive routing → demo → results → limitations
- Demo script: who clicks what, which bug, what to say — 5 minutes max
