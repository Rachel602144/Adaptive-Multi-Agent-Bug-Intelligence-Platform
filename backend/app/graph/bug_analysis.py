"""Bug Analysis Agent — LLM extraction of category, module, nature, possible cause."""
import re

from app import llm
from app.graph.common import agent_node, bug_text
from app.knowledge import MODULES, category_for_module, keyword_module

PROMPT = """You are the Bug Analysis Agent. Analyse the bug report and extract structured information.

Known modules: {modules}
Categories: Frontend, Backend, Database, Performance, Security, Infrastructure

Bug title: {title}
Description: {description}
Stack trace: {stack_trace}
Environment: {environment}

Return JSON:
{{"category": "...", "module": "<one of the known modules>", "nature": "short description of the problem",
  "possible_cause": "most likely root cause in one sentence", "technical_info": "key technical details (exception, file, endpoint) or empty"}}"""


def _trace_summary(stack_trace: str) -> str:
    if not stack_trace:
        return ""
    lines = [l.strip() for l in stack_trace.strip().splitlines() if l.strip()]
    exc = next((l for l in reversed(lines) if re.search(r"(Error|Exception|Traceback|Fault)", l)), lines[-1])
    loc = next((l for l in reversed(lines) if re.search(r"(File \"|\.py|\.java|\.js|line \d+)", l)), "")
    return " | ".join(filter(None, [exc, loc]))[:300]


def rule_analysis(state: dict) -> dict:
    module, _ = keyword_module(bug_text(state))
    tech = _trace_summary(state.get("stack_trace") or "")
    return {"analysis": {
        "category": category_for_module(module),
        "module": module,
        "nature": state.get("title", ""),
        "possible_cause": f"Needs investigation — {tech}" if tech else "Needs investigation",
        "technical_info": tech,
        "source": "rules",
    }}


def run(state: dict):
    data, usage = llm.call_json(PROMPT.format(
        modules=", ".join(MODULES), title=state.get("title", ""),
        description=(state.get("description") or "")[:3000], stack_trace=(state.get("stack_trace") or "none")[:2000],
        environment=state.get("environment") or "n/a"))
    if not data:
        return rule_analysis(state), {**usage, "source": "rules"}
    base = rule_analysis(state)["analysis"]
    module = data.get("module") if data.get("module") in MODULES else base["module"]
    analysis = {
        "category": data.get("category") or category_for_module(module),
        "module": module,
        "nature": data.get("nature") or base["nature"],
        "possible_cause": data.get("possible_cause") or base["possible_cause"],
        "technical_info": data.get("technical_info") or base["technical_info"],
        "source": "gemini",
    }
    return {"analysis": analysis}, {**usage, "source": "gemini"}


node = agent_node("bug_analysis", run, rule_analysis)
