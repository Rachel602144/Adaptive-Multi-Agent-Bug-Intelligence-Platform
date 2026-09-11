"""Node wrapper: timing, usage logging, fault tolerance."""
import logging
import time
from typing import Callable

log = logging.getLogger("graph")


def bug_text(state: dict) -> str:
    return " ".join(filter(None, [state.get("title"), state.get("description"), state.get("stack_trace")]))


def agent_node(name: str, run: Callable[[dict], tuple[dict, dict]], fallback: Callable[[dict], dict]):
    """run(state) -> (updates, usage). On exception, fallback(state) -> updates, status=failed."""

    def node(state: dict) -> dict:
        start = time.perf_counter()
        try:
            updates, usage = run(state)
            status, errors = "ran", []
        except Exception as e:  # fault tolerance: never break the graph
            log.exception("Agent %s failed", name)
            updates, usage = fallback(state), {"llm_calls": 0, "tokens": 0}
            status, errors = "failed", [f"{name}: {type(e).__name__}: {e}"]
        ms = int((time.perf_counter() - start) * 1000)
        extra = updates.pop("execution_trace", [])
        entry = {"agent": name, "status": status, "ms": ms,
                 "llm_calls": usage.get("llm_calls", 0), "tokens": usage.get("tokens", 0),
                 "source": usage.get("source", "")}
        return {**updates, "execution_trace": extra + [entry], "errors": errors}

    node.__name__ = name
    return node
