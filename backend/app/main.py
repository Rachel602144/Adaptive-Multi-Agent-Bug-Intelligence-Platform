"""FastAPI entry (Rachel). Routes per contract.

The full pipeline is LangGraph + Gemini once GOOGLE_API_KEY and the trained
severity model exist (see TASKS.md). Until then this runs the same shape —
supervisor -> bug_analysis -> [duplicate?] -> [severity?] -> [assignment?]
-> engineering_decision -> execution_trace — using the rule-based fallbacks
the spec already calls for, plus the stub agents in app/ml/interfaces.py.
Bugs live in an in-memory store; restarting the server clears history.
"""
import os
import time
from itertools import count
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.ml import interfaces as ml

app = FastAPI(title="Bug Intelligence Platform")

_frontend_origin = os.environ.get("FRONTEND_ORIGIN")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[_frontend_origin] if _frontend_origin else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_STORE: dict[int, dict] = {}
_ids = count(1)

_FULL_PATH_KW = ("500", "crash", "auth", "login", "payment", "data loss", "security", "outage")
_LIGHT_PATH_KW = ("typo", "css", "align", "color", "colour", "font", "spacing", "cosmetic", "label")

_MODULE_KEYWORDS = {
    "Authentication": ("auth", "login", "password", "session", "token"),
    "Payment": ("payment", "checkout", "billing", "invoice", "charge"),
    "Database": ("database", "query", "sql", "migration"),
    "API": ("api", "endpoint", "timeout", "request"),
    "Notifications": ("notification", "email", "alert", "push"),
    "Search": ("search", "filter", "index"),
    "Performance": ("slow", "latency", "performance", "lag"),
    "UI": ("ui", "css", "button", "align", "layout", "style", "typo", "font", "color", "colour"),
}

_PRIORITY_RULES = {
    "Critical": ("P1", "Hotfix", "1-2 days", "Investigate immediately"),
    "High": ("P2", "Next", "3-5 days", "Prioritize this sprint"),
    "Medium": ("P3", "Next", "1-2 weeks", "Schedule for an upcoming sprint"),
    "Low": ("P4", "Backlog", "When convenient", "Backlog for future consideration"),
}


class BugIn(BaseModel):
    title: str
    description: str
    stack_trace: Optional[str] = None
    environment: Optional[str] = None


def _detect_module(text: str) -> str:
    lowered = text.lower()
    for module, keywords in _MODULE_KEYWORDS.items():
        if any(kw in lowered for kw in keywords):
            return module
    return "General"


def _run_supervisor(bug: BugIn) -> tuple[list[str], str]:
    combined = f"{bug.title} {bug.description}".lower()
    if bug.stack_trace or any(kw in combined for kw in _FULL_PATH_KW):
        return ["duplicate", "severity", "assignment"], (
            "Backend/system-impacting language or a stack trace was present — full analysis required."
        )
    if any(kw in combined for kw in _LIGHT_PATH_KW):
        return ["severity"], "Cosmetic/UI language detected — light path, skipping dedup and routing."
    return ["duplicate", "severity", "assignment"], "No clear signal either way — defaulting to full analysis."


def _run_bug_analysis(bug: BugIn, module: str) -> dict:
    category = "Frontend" if module == "UI" else "Backend" if module != "General" else "General"
    nature = "Client-side rendering/behavior issue" if category == "Frontend" else "Server-side failure"
    possible_cause = "Unhandled state or missing null-check on the client" if category == "Frontend" else "Unhandled exception in request path"
    technical_info = ""
    if bug.stack_trace:
        technical_info = bug.stack_trace.strip().splitlines()[-1][:200]
        possible_cause = technical_info or possible_cause
    return {
        "category": category,
        "module": module,
        "nature": nature,
        "possible_cause": possible_cause,
        "technical_info": technical_info or "No stack trace provided.",
    }


def _run_engineering_decision(severity_label: str, duplicate: dict, assignment: dict, possible_cause: str) -> dict:
    priority, target_release, eta, action = _PRIORITY_RULES[severity_label]
    if duplicate["is_duplicate"]:
        explanation = (
            f"Matches an existing report ({duplicate['match_title']!r}, "
            f"similarity {duplicate['score']:.2f}) — inheriting its triage instead of re-analyzing."
        )
    else:
        explanation = (
            f"{severity_label} severity, routed to {assignment['team']} "
            f"({assignment['rule']})."
        )
    return {
        "priority": priority,
        "recommended_action": action,
        "team": assignment["team"],
        "target_release": target_release,
        "estimated_resolution": eta,
        "possible_cause": possible_cause,
        "explanation": explanation,
    }


def _process_bug(bug: BugIn) -> dict:
    bug_id = next(_ids)
    trace: list[dict] = []
    errors: list[str] = []

    t0 = time.perf_counter()
    selected_agents, supervisor_reason = _run_supervisor(bug)
    trace.append({"agent": "supervisor", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})

    t0 = time.perf_counter()
    module = _detect_module(f"{bug.title} {bug.description} {bug.stack_trace or ''}")
    analysis = _run_bug_analysis(bug, module)
    trace.append({"agent": "bug_analysis", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})

    duplicate = None
    if "duplicate" in selected_agents:
        t0 = time.perf_counter()
        try:
            duplicate = ml.detect_duplicate(bug.title, bug.description)
            trace.append({"agent": "duplicate", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})
        except Exception as exc:  # noqa: BLE001 — fault tolerance per spec
            errors.append(f"duplicate agent failed: {exc}")
            duplicate = {"is_duplicate": False, "match_id": None, "match_title": None, "score": 0.0}
            trace.append({"agent": "duplicate", "status": "failed", "ms": round((time.perf_counter() - t0) * 1000, 1)})
    else:
        trace.append({"agent": "duplicate", "status": "skipped", "ms": 0})
        duplicate = {"is_duplicate": False, "match_id": None, "match_title": None, "score": 0.0}

    short_circuit = duplicate["is_duplicate"] and duplicate["match_id"] in _STORE

    severity = None
    if short_circuit:
        severity = _STORE[duplicate["match_id"]]["severity"]
        trace.append({"agent": "severity", "status": "skipped", "ms": 0})
    elif "severity" in selected_agents:
        t0 = time.perf_counter()
        try:
            severity = ml.predict_severity(f"{bug.title} {bug.description} {bug.stack_trace or ''}")
            trace.append({"agent": "severity", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})
        except Exception as exc:  # noqa: BLE001
            errors.append(f"severity agent failed: {exc}")
            severity = {"label": "Medium", "confidence": 0.5}
            trace.append({"agent": "severity", "status": "failed", "ms": round((time.perf_counter() - t0) * 1000, 1)})
    else:
        trace.append({"agent": "severity", "status": "skipped", "ms": 0})
        severity = {"label": "Medium", "confidence": 0.5}

    assignment = None
    if short_circuit:
        assignment = _STORE[duplicate["match_id"]]["assignment"]
        trace.append({"agent": "assignment", "status": "skipped", "ms": 0})
    elif "assignment" in selected_agents:
        t0 = time.perf_counter()
        try:
            assignment = ml.assign_team(module, analysis["category"])
            trace.append({"agent": "assignment", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})
        except Exception as exc:  # noqa: BLE001
            errors.append(f"assignment agent failed: {exc}")
            assignment = {"team": "Backend Team", "rule": "default"}
            trace.append({"agent": "assignment", "status": "failed", "ms": round((time.perf_counter() - t0) * 1000, 1)})
    else:
        trace.append({"agent": "assignment", "status": "skipped", "ms": 0})
        assignment = {"team": "Backend Team", "rule": "default"}

    t0 = time.perf_counter()
    if short_circuit:
        decision = _STORE[duplicate["match_id"]]["decision"]
    else:
        decision = _run_engineering_decision(severity["label"], duplicate, assignment, analysis["possible_cause"])
    trace.append({"agent": "engineering_decision", "status": "ran", "ms": round((time.perf_counter() - t0) * 1000, 1)})

    state = {
        "bug_id": bug_id,
        "title": bug.title,
        "description": bug.description,
        "stack_trace": bug.stack_trace,
        "environment": bug.environment,
        "selected_agents": selected_agents,
        "supervisor_reason": supervisor_reason,
        "analysis": analysis,
        "duplicate": duplicate,
        "severity": severity,
        "assignment": assignment,
        "decision": decision,
        "execution_trace": trace,
        "errors": errors,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    _STORE[bug_id] = state
    ml.record_for_duplicate_matching(bug_id, bug.title, bug.description)
    return state


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/bugs")
def submit_bug(bug: BugIn):
    return _process_bug(bug)


@app.get("/api/bugs")
def list_bugs():
    return list(_STORE.values())


@app.get("/api/bugs/{bug_id}")
def get_bug(bug_id: int):
    if bug_id not in _STORE:
        raise HTTPException(status_code=404, detail="Bug not found")
    return _STORE[bug_id]


@app.get("/api/stats")
def stats():
    bugs = list(_STORE.values())
    by_severity: dict[str, int] = {}
    by_category: dict[str, int] = {}
    by_team: dict[str, int] = {}
    duplicates = 0

    for b in bugs:
        if b["severity"]:
            by_severity[b["severity"]["label"]] = by_severity.get(b["severity"]["label"], 0) + 1
        if b["analysis"]:
            by_category[b["analysis"]["category"]] = by_category.get(b["analysis"]["category"], 0) + 1
        if b["assignment"]:
            by_team[b["assignment"]["team"]] = by_team.get(b["assignment"]["team"], 0) + 1
        if b["duplicate"] and b["duplicate"]["is_duplicate"]:
            duplicates += 1

    return {
        "total": len(bugs),
        "by_severity": by_severity,
        "duplicates": duplicates,
        "by_category": by_category,
        "by_team": by_team,
    }


@app.get("/api/teams")
def teams():
    names = sorted(set(ml.MODULE_TEAM.values()) | {"Backend Team"})
    return [{"name": name, "module_count": sum(1 for t in ml.MODULE_TEAM.values() if t == name)} for name in names]
