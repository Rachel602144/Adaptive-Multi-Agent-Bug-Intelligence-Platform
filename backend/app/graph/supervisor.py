"""Supervisor Agent — adaptive agent selection (the core novelty)."""
import re

from app import config, llm
from app.graph.common import agent_node

CRITICAL_SIGNALS = ["500", "crash", "exception", "traceback", "error", "fail", "auth", "login", "password",
                    "payment", "checkout", "data loss", "corrupt", "security", "outage", "down", "timeout",
                    "deadlock", "leak", "unauthorized"]
COSMETIC_SIGNALS = ["typo", "misspelled", "spelling", "alignment", "align", "color", "colour", "font",
                    "css", "padding", "margin", "icon", "tooltip", "cosmetic", "label"]

PROMPT = """You are the Supervisor Agent of a bug-triage system. Decide which specialised agents must run
for this bug. Bug Analysis and Engineering Decision ALWAYS run. Choose any subset of the optional agents:
- "duplicate": check if this bug was reported before (useful for functional/backend bugs users are likely to re-report)
- "severity": ML severity prediction (needed when impact is unclear or potentially serious)
- "assignment": route to an engineering team (needed unless the owner is obvious, e.g. a pure cosmetic UI fix)

Rules of thumb: simple cosmetic UI issues (typos, alignment, colors) need NO optional agents.
Crashes, server errors, auth/payment/data issues, or bugs with stack traces need ALL optional agents.
Avoid unnecessary agents — each one costs time.

Bug title: {title}
Description: {description}
Stack trace present: {has_trace}
Environment: {environment}

Return JSON: {{"selected_agents": [...], "complexity": "simple|moderate|complex", "reason": "one sentence"}}"""


def _has(text: str, words: list[str]) -> bool:
    return any(re.search(rf"\b{re.escape(w)}", text) for w in words)


def rule_select(state: dict) -> dict:
    text = f"{state.get('title', '')} {state.get('description', '')}".lower()
    has_trace = bool((state.get("stack_trace") or "").strip())
    if has_trace or _has(text, CRITICAL_SIGNALS):
        return {"selected_agents": list(config.OPTIONAL_AGENTS),
                "supervisor_reason": "Rule: critical signals (stack trace / server error / auth / payment / data) — full analysis."}
    if _has(text, COSMETIC_SIGNALS):
        return {"selected_agents": [],
                "supervisor_reason": "Rule: cosmetic UI issue with no failure signals — light path (analysis + decision only)."}
    return {"selected_agents": ["duplicate", "severity", "assignment"],
            "supervisor_reason": "Rule: functional issue with unclear impact — full analysis."}


def run(state: dict):
    if state.get("mode") == "static":
        return ({"selected_agents": list(config.OPTIONAL_AGENTS), "short_circuit": False,
                 "supervisor_reason": "Static mode: every agent runs for every bug (baseline)."},
                {"llm_calls": 0, "tokens": 0, "source": "static"})

    data, usage = llm.call_json(PROMPT.format(
        title=state.get("title", ""), description=state.get("description", "")[:2000],
        has_trace=bool((state.get("stack_trace") or "").strip()), environment=state.get("environment") or "n/a"))
    if data and isinstance(data.get("selected_agents"), list):
        selected = [a for a in config.OPTIONAL_AGENTS if a in data["selected_agents"]]  # keep canonical order
        return ({"selected_agents": selected, "short_circuit": False,
                 "supervisor_reason": str(data.get("reason", "")).strip() or "LLM selection"},
                {**usage, "source": "gemini"})
    return {**rule_select(state), "short_circuit": False}, {**usage, "source": "rules"}


def fallback(state: dict) -> dict:
    return {**rule_select(state), "short_circuit": False}


node = agent_node("supervisor", run, fallback)
