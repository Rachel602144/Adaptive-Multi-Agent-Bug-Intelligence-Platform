"""Final API response shape (the contract the frontend uses)."""


def serialize_state(bug_id: int, state: dict) -> dict:
    trace = state.get("execution_trace", [])
    order = ["supervisor", "bug_analysis", "duplicate", "severity", "assignment", "engineering_decision"]
    trace = sorted(trace, key=lambda e: order.index(e["agent"]) if e["agent"] in order else 99)
    return {
        "bug_id": bug_id,
        "title": state.get("title"),
        "description": state.get("description"),
        "stack_trace": state.get("stack_trace"),
        "environment": state.get("environment"),
        "mode": state.get("mode"),
        "selected_agents": state.get("selected_agents", []),
        "supervisor_reason": state.get("supervisor_reason", ""),
        "short_circuit": state.get("short_circuit", False),
        "analysis": state.get("analysis"),
        "duplicate": state.get("duplicate"),
        "severity": state.get("severity"),
        "assignment": state.get("assignment"),
        "decision": state.get("decision"),
        "execution_trace": trace,
        "errors": state.get("errors", []),
        "metrics": {
            "total_ms": sum(e.get("ms", 0) for e in trace),
            "llm_calls": sum(e.get("llm_calls", 0) for e in trace),
            "tokens": sum(e.get("tokens", 0) for e in trace),
            "agents_run": sum(1 for e in trace if e["status"] != "skipped"),
        },
    }
