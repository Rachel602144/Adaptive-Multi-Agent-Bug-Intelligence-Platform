"""Ablation: adaptive vs static pipeline on a CSV of bugs.

Run from backend/:  python -m scripts.evaluate            (defaults to ../data/test_bugs.csv)
CSV columns: title, description, [stack_trace], [expected_severity], [expected_team], [expected_path: Light|Adaptive|Full|Duplicate]
Outputs: reports/ablation_runs.csv, reports/ablation_summary.json
"""
import json
import sys
from pathlib import Path

import pandas as pd

from app import config
from app.db import repository
from app.db.database import init_db
from app.graph.graph import run_triage
from app.ml import duplicate


def main(csv_path: str):
    init_db()
    duplicate.set_loader(repository.load_comparable_bugs)
    df = pd.read_csv(csv_path).fillna("")
    rows = []
    for mode in ["adaptive", "static"]:
        for _, b in df.iterrows():
            state = run_triage({"title": b["title"], "description": b.get("description", ""),
                                "stack_trace": b.get("stack_trace") or None}, mode=mode)
            trace = state["execution_trace"]
            d = state.get("decision") or {}
            ran = sum(1 for e in trace if e["status"] == "ran")
            path_label = ("Duplicate" if state.get("short_circuit") or d.get("is_duplicate")
                          else "Light" if ran <= 3 else "Full" if ran >= 6 else "Adaptive")
            rows.append({
                "mode": mode, "id": b.get("id", ""), "title": b["title"],
                "agents_run": sum(1 for e in trace if e["status"] != "skipped"),
                "path": "+".join(e["agent"] for e in trace if e["status"] == "ran"),
                "total_ms": sum(e["ms"] for e in trace),
                "llm_calls": sum(e.get("llm_calls", 0) for e in trace),
                "tokens": sum(e.get("tokens", 0) for e in trace),
                "severity": d.get("severity"), "team": d.get("team"), "priority": d.get("priority"),
                "is_duplicate": d.get("is_duplicate"),
                "path_label": path_label,
                "expected_severity": b.get("expected_severity", ""), "expected_team": b.get("expected_team", ""),
                "expected_path": b.get("expected_path", ""),
            })
            print(f"[{mode}] {b['title'][:50]:50} → {d.get('priority')} {d.get('severity')} {d.get('team')} {path_label}")

    out = pd.DataFrame(rows)
    for f, col in [("severity", "severity"), ("team", "team"), ("path", "path_label")]:
        exp = out[f"expected_{f}"].astype(str).str.strip().str.split().str[0].fillna("").str.lower()  # "Duplicate (of D2)" -> "duplicate"
        out[f"{f}_match"] = (exp.str.len() > 0) & (exp == out[col].astype(str).str.strip().str.lower())
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out.to_csv(config.REPORTS_DIR / "ablation_runs.csv", index=False)

    summary = {}
    for mode, g in out.groupby("mode"):
        s = {"bugs": int(len(g)), "avg_agents_run": round(g["agents_run"].mean(), 2),
             "avg_ms": round(g["total_ms"].mean(), 1), "avg_llm_calls": round(g["llm_calls"].mean(), 2),
             "avg_tokens": round(g["tokens"].mean(), 1)}
        for field in ["severity", "team", "path"]:
            labelled = g[g[f"expected_{field}"].astype(str).str.strip().str.len() > 0]  # rows with an expected value
            if len(labelled) and not (field == "path" and mode == "static"):
                s[f"{field}_matches"] = f"{int(labelled[f'{field}_match'].sum())}/{len(labelled)}"
                s[f"{field}_accuracy"] = round(float(labelled[f"{field}_match"].mean()), 3)
        s["latency_by_path_ms"] = {k: {"bugs": int(len(v)), "avg_ms": round(v["total_ms"].mean(), 1)}
                                   for k, v in g.groupby("path_label")}
        summary[mode] = s
    (config.REPORTS_DIR / "ablation_summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(Path(config.DATA_DIR) / "test_bugs.csv"))
