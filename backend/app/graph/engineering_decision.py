"""Engineering Decision Agent — combines agent outputs into one explainable recommendation.
Rules decide the numbers (deterministic); Gemini writes the explanation (template fallback)."""
from app import config, llm
from app.graph.common import agent_node, bug_text
from app.knowledge import CORE_MODULES, MODULES
from app.ml.severity import rule_severity

PRIORITY = {"Critical": "P1", "High": "P2", "Medium": "P3", "Low": "P4"}
PLAN = {  # priority → (action, target release, estimated resolution)
    "P1": ("Investigate immediately", "Hotfix", "1–2 days"),
    "P2": ("Schedule in current sprint", "Next release", "3–5 days"),
    "P3": ("Add to upcoming sprint", "Next release", "1–2 weeks"),
    "P4": ("Add to backlog", "Backlog", "2–4 weeks"),
}
BUMP = {"P2": "P1", "P3": "P2", "P4": "P3"}

PROMPT = """You are the Engineering Decision Agent. Write a clear 2–3 sentence explanation for this triage
decision, citing the evidence from the agents. Do not change the decision.

Bug: {title}
Evidence: {evidence}
Decision: priority {priority}, severity {severity}, team {team}, action "{action}", target release {release}

Return JSON: {{"explanation": "..."}}"""


def _resolve(state: dict) -> dict:
    analysis = state.get("analysis") or {}
    dup = state.get("duplicate") or {}
    short = bool(state.get("short_circuit")) or bool(dup.get("is_duplicate"))

    # severity: agent → inherited from duplicate → rule estimate
    if state.get("severity"):
        severity, sev_source = state["severity"]["label"], "Severity agent"
    elif short and dup.get("match_severity"):
        severity, sev_source = dup["match_severity"], f"inherited from duplicate #{dup['match_id']}"
    else:
        severity, sev_source = rule_severity(bug_text(state))["label"], "rule estimate (severity agent not selected)"

    # team: agent → inherited → module rule
    module = analysis.get("module", "")
    if state.get("assignment"):
        team, team_source = state["assignment"]["team"], "Assignment agent"
    elif short and dup.get("match_team"):
        team, team_source = dup["match_team"], f"inherited from duplicate #{dup['match_id']}"
    else:
        team = MODULES.get(module, ("Backend Team", []))[0]
        team_source = "module rule (assignment agent not selected)"

    priority = PRIORITY.get(severity, "P3")
    bumped = False
    if module in CORE_MODULES and priority in ("P2", "P3") and not short:
        priority, bumped = BUMP[priority], True
    action, release, eta = PLAN[priority]
    if short:
        action = f"Link to existing bug #{dup.get('match_id')} and close as duplicate"
        release, eta = "Tracked in original bug", "—"
    elif dup.get("possible_duplicate"):
        action += f" (check possible duplicate #{dup.get('match_id')})"

    return {"severity": severity, "severity_source": sev_source, "team": team, "team_source": team_source,
            "priority": priority, "core_module_bump": bumped, "recommended_action": action,
            "target_release": release, "estimated_resolution": eta,
            "possible_cause": analysis.get("possible_cause", ""),
            "is_duplicate": short, "duplicate_of": dup.get("match_id") if short else None}


def _template(state: dict, d: dict) -> str:
    a = state.get("analysis") or {}
    parts = [f"{d['severity']} {a.get('category', '').lower()} issue in the {a.get('module', 'unknown')} module"
             f" ({d['severity_source']})."]
    if d["is_duplicate"]:
        parts.append(f"It duplicates bug #{d['duplicate_of']} (similarity {(state.get('duplicate') or {}).get('score')}), so no new work is needed.")
    else:
        parts.append(f"Routed to {d['team']} ({d['team_source']}); priority {d['priority']}"
                     + (" raised because it affects a core module." if d["core_module_bump"] else "."))
    return " ".join(parts)


def _evidence(state: dict) -> str:
    keys = ["analysis", "duplicate", "severity", "assignment"]
    return "; ".join(f"{k}: {state[k]}" for k in keys if state.get(k))[:2500]


def _skipped_entries(state: dict) -> list[dict]:
    ran = {e["agent"] for e in state.get("execution_trace", [])} | {"engineering_decision"}
    entries = []
    for agent in config.OPTIONAL_AGENTS:
        if agent in ran:
            continue
        reason = ("duplicate short-circuit" if state.get("short_circuit") and agent in state.get("selected_agents", [])
                  else "not selected by supervisor")
        entries.append({"agent": agent, "status": "skipped", "ms": 0, "llm_calls": 0, "tokens": 0, "source": reason})
    return entries


def run(state: dict):
    d = _resolve(state)
    data, usage = llm.call_json(PROMPT.format(
        title=state.get("title", ""), evidence=_evidence(state), priority=d["priority"], severity=d["severity"],
        team=d["team"], action=d["recommended_action"], release=d["target_release"]))
    d["explanation"] = (data or {}).get("explanation") or _template(state, d)
    d["explanation_source"] = "gemini" if data and data.get("explanation") else "template"
    return {"decision": d, "execution_trace": _skipped_entries(state)}, {**usage, "source": d["explanation_source"]}


def fallback(state: dict) -> dict:
    d = _resolve(state)
    d["explanation"], d["explanation_source"] = _template(state, d), "template"
    return {"decision": d, "execution_trace": _skipped_entries(state)}


node = agent_node("engineering_decision", run, fallback)
