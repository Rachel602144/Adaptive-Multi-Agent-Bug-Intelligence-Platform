"""LangGraph workflow with adaptive (conditional) routing.

START → supervisor → bug_analysis → [duplicate?] → [severity?] → [assignment?] → engineering_decision → END
"""
from app import config
from app.graph import bug_analysis, engineering_decision, supervisor
from app.graph.ml_agents import assignment_node, duplicate_node, severity_node
from app.graph.state import BugState

ORDER = ["duplicate", "severity", "assignment"]


def next_step(state: dict, after: str) -> str:
    """Pure routing function: next selected optional agent after `after`, else the decision agent."""
    if after == "duplicate" and state.get("short_circuit"):
        return "engineering_decision"
    selected = state.get("selected_agents") or []
    start = ORDER.index(after) + 1 if after in ORDER else 0
    for agent in ORDER[start:]:
        if agent in selected:
            return agent
    return "engineering_decision"


def build_graph():
    from langgraph.graph import END, START, StateGraph

    g = StateGraph(BugState)
    g.add_node("supervisor", supervisor.node)
    g.add_node("bug_analysis", bug_analysis.node)
    g.add_node("duplicate", duplicate_node)
    g.add_node("severity", severity_node)
    g.add_node("assignment", assignment_node)
    g.add_node("engineering_decision", engineering_decision.node)

    g.add_edge(START, "supervisor")
    g.add_edge("supervisor", "bug_analysis")
    for src in ["bug_analysis", *ORDER]:
        targets = [t for t in ORDER[ORDER.index(src) + 1:]] if src in ORDER else list(ORDER)
        g.add_conditional_edges(src, lambda s, _src=src: next_step(s, _src),
                                {t: t for t in [*targets, "engineering_decision"]})
    g.add_edge("engineering_decision", END)
    return g.compile()


_graph = None


def run_triage(bug: dict, mode: str = None) -> dict:
    global _graph
    if _graph is None:
        _graph = build_graph()
    state = {
        "bug_id": bug.get("bug_id"),
        "title": bug["title"],
        "description": bug.get("description") or "",
        "stack_trace": bug.get("stack_trace"),
        "environment": bug.get("environment"),
        "mode": mode or config.DEFAULT_MODE,
        "selected_agents": [],
        "short_circuit": False,
        "analysis": None, "duplicate": None, "severity": None, "assignment": None, "decision": None,
        "execution_trace": [],
        "errors": [],
    }
    return _graph.invoke(state)
