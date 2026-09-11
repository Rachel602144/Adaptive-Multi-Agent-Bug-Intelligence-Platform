"""Duplicate Detection, Severity Prediction and Assignment agents (ML + rules, no LLM)."""
from app.graph.common import agent_node, bug_text
from app.ml.interfaces import assign_team, detect_duplicate, predict_severity


# --- Duplicate Detection ---
def _dup_run(state: dict):
    exclude = ("bug", state["bug_id"]) if state.get("bug_id") else None
    result = detect_duplicate(state.get("title", ""), state.get("description", ""), exclude)
    short = bool(result["is_duplicate"]) and state.get("mode") != "static"
    return {"duplicate": result, "short_circuit": short}, {"source": "tfidf"}


def _dup_fallback(state: dict) -> dict:
    return {"duplicate": {"is_duplicate": False, "possible_duplicate": False, "match_id": None,
                          "match_title": None, "score": 0.0, "top_matches": [], "error": True},
            "short_circuit": False}


duplicate_node = agent_node("duplicate", _dup_run, _dup_fallback)


# --- Severity Prediction ---
def _sev_run(state: dict):
    module = (state.get("analysis") or {}).get("module", "")
    result = predict_severity(f"{state.get('title', '')} {state.get('description', '')} {module}")
    return {"severity": result}, {"source": result.get("source", "model")}


def _sev_fallback(state: dict) -> dict:
    return {"severity": {"label": "Medium", "confidence": 0.0, "source": "default"}}


severity_node = agent_node("severity", _sev_run, _sev_fallback)


# --- Assignment ---
def _assign_run(state: dict):
    a = state.get("analysis") or {}
    result = assign_team(a.get("module", ""), a.get("category", ""), bug_text(state))
    return {"assignment": result}, {"source": "rules"}


def _assign_fallback(state: dict) -> dict:
    return {"assignment": {"team": "Backend Team", "rule": "default (assignment failed)", "matched_on": "default"}}


assignment_node = agent_node("assignment", _assign_run, _assign_fallback)
