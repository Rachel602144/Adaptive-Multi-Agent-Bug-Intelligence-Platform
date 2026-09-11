"""All DB reads/writes used by the API."""
from collections import Counter

from sqlalchemy import func, select

from app.graph.serialize import serialize_state
from app.db.database import AgentResult, Bug, Comparison, HistoricalBug, ProcessingHistory, Recommendation, SessionLocal


def load_comparable_bugs() -> list[dict]:
    """Corpus for duplicate detection: historical bugs + already-triaged submitted bugs."""
    with SessionLocal() as s:
        records = [
            {"ref": f"H-{h.id}", "raw_id": h.id, "source": "historical", "title": h.title,
             "description": h.description, "severity": h.severity, "module": h.module, "team": h.team}
            for h in s.scalars(select(HistoricalBug).order_by(HistoricalBug.id))
        ]
        rows = s.execute(select(Bug, Recommendation).join(Recommendation, Recommendation.bug_id == Bug.id).order_by(Bug.id))
        for bug, rec in rows:
            records.append({"ref": f"BUG-{bug.id}", "raw_id": bug.id, "source": "bug", "title": bug.title,
                            "description": bug.description, "severity": rec.severity, "module": rec.module,
                            "team": rec.team})
    return records


def create_bug(data: dict, mode: str) -> int:
    with SessionLocal() as s:
        bug = Bug(title=data["title"], description=data.get("description") or "", stack_trace=data.get("stack_trace"),
                  environment=data.get("environment"), mode=mode, status="received")
        s.add(bug)
        s.flush()
        s.add(ProcessingHistory(bug_id=bug.id, event="received", detail=f"mode={mode}"))
        s.commit()
        return bug.id


def save_result(bug_id: int, state: dict) -> dict:
    trace = state.get("execution_trace", [])
    decision = state.get("decision") or {}
    analysis = state.get("analysis") or {}
    dup = state.get("duplicate") or {}
    outputs = {"supervisor": {"selected_agents": state.get("selected_agents"), "reason": state.get("supervisor_reason")},
               "bug_analysis": analysis, "duplicate": dup, "severity": state.get("severity"),
               "assignment": state.get("assignment"), "engineering_decision": decision}
    result = serialize_state(bug_id, state)
    with SessionLocal() as s:
        bug = s.get(Bug, bug_id)
        bug.status = "triaged" if decision else "failed"
        bug.result = result
        for e in trace:
            s.add(AgentResult(bug_id=bug_id, agent=e["agent"], status=e["status"], ms=e["ms"],
                              llm_calls=e.get("llm_calls", 0), tokens=e.get("tokens", 0), source=e.get("source", ""),
                              output=outputs.get(e["agent"]) if e["status"] != "skipped" else None))
        if decision:
            s.add(Recommendation(
                bug_id=bug_id, priority=decision["priority"], severity=decision["severity"], team=decision["team"],
                category=analysis.get("category", ""), module=analysis.get("module", ""),
                recommended_action=decision["recommended_action"], target_release=decision["target_release"],
                estimated_resolution=decision["estimated_resolution"], possible_cause=decision.get("possible_cause", ""),
                explanation=decision.get("explanation", ""), is_duplicate=decision.get("is_duplicate", False),
                duplicate_of=decision.get("duplicate_of"), duplicate_score=float(dup.get("score") or 0)))
        s.add(ProcessingHistory(bug_id=bug_id, event=bug.status, detail="; ".join(state.get("errors", [])),
                                total_ms=result["metrics"]["total_ms"], llm_calls=result["metrics"]["llm_calls"],
                                tokens=result["metrics"]["tokens"]))
        s.commit()
    return result


def get_bug(bug_id: int) -> dict | None:
    with SessionLocal() as s:
        bug = s.get(Bug, bug_id)
        if not bug:
            return None
        return bug.result or {"bug_id": bug.id, "title": bug.title, "description": bug.description,
                              "status": bug.status, "execution_trace": [], "errors": []}


def list_bugs(limit: int = 200) -> list[dict]:
    with SessionLocal() as s:
        rows = s.execute(select(Bug, Recommendation).outerjoin(Recommendation, Recommendation.bug_id == Bug.id)
                         .order_by(Bug.id.desc()).limit(limit))
        out = []
        for bug, rec in rows:
            path = [e["agent"] for e in (bug.result or {}).get("execution_trace", []) if e["status"] == "ran"]
            out.append({
                "bug_id": bug.id, "title": bug.title, "status": bug.status, "mode": bug.mode,
                "created_at": bug.created_at.isoformat() if bug.created_at else None,
                "severity": rec.severity if rec else None, "priority": rec.priority if rec else None,
                "team": rec.team if rec else None, "category": rec.category if rec else None,
                "module": rec.module if rec else None, "is_duplicate": rec.is_duplicate if rec else False,
                "duplicate_of": rec.duplicate_of if rec else None,
                "agents_run": path, "agents_run_count": len(path),
                "total_ms": (bug.result or {}).get("metrics", {}).get("total_ms"),
                "llm_calls": (bug.result or {}).get("metrics", {}).get("llm_calls", 0),
                "tokens": (bug.result or {}).get("metrics", {}).get("tokens", 0),
                "short_circuit": (bug.result or {}).get("short_circuit", False),
            })
        return out


def stats() -> dict:
    with SessionLocal() as s:
        recs = list(s.scalars(select(Recommendation)))
        total = s.scalar(select(func.count(Bug.id))) or 0
        hist = s.scalar(select(func.count(HistoricalBug.id))) or 0
        agent_rows = s.execute(select(AgentResult.agent, AgentResult.status, func.count(), func.avg(AgentResult.ms))
                               .group_by(AgentResult.agent, AgentResult.status)).all()
        runs = list(s.scalars(select(ProcessingHistory).where(ProcessingHistory.event == "triaged")))
        mode_rows = [(b.mode, (b.result or {}).get("metrics", {})) for b in s.scalars(select(Bug).where(Bug.status == "triaged"))]
        comps = [c.summary for c in s.scalars(select(Comparison)) if c.summary]
    sev = Counter(r.severity for r in recs)
    agent_usage: dict = {}
    for agent, status, count, avg_ms in agent_rows:
        a = agent_usage.setdefault(agent, {"ran": 0, "skipped": 0, "failed": 0, "avg_ms": 0})
        a[status] = count
        if status == "ran":
            a["avg_ms"] = int(avg_ms or 0)
    return {
        "total": total,
        "triaged": len(recs),
        "historical_bugs": hist,
        "critical": sev.get("Critical", 0),
        "high": sev.get("High", 0),
        "duplicates": sum(1 for r in recs if r.is_duplicate),
        "by_severity": {k: sev.get(k, 0) for k in ["Critical", "High", "Medium", "Low"]},
        "by_priority": dict(Counter(r.priority for r in recs)),
        "by_category": dict(Counter(r.category or "Unknown" for r in recs)),
        "by_team": dict(Counter(r.team for r in recs)),
        "by_module": dict(Counter(r.module or "Unknown" for r in recs)),
        "agent_usage": agent_usage,
        "avg_total_ms": int(sum(r.total_ms for r in runs) / len(runs)) if runs else 0,
        "avg_llm_calls": round(sum(r.llm_calls for r in runs) / len(runs), 2) if runs else 0,
        "by_mode": _by_mode(mode_rows),
        "comparisons": _comparison_summary(comps),
    }


def _avg(values: list) -> float:
    return round(sum(values) / len(values), 2) if values else 0


def _by_mode(rows: list) -> dict:
    out = {}
    for mode in ["adaptive", "static"]:
        m = [metrics for md, metrics in rows if md == mode]
        out[mode] = {"runs": len(m),
                     "avg_agents_run": _avg([x.get("agents_run", 0) for x in m]),
                     "avg_total_ms": _avg([x.get("total_ms", 0) for x in m]),
                     "avg_llm_calls": _avg([x.get("llm_calls", 0) for x in m]),
                     "avg_tokens": _avg([x.get("tokens", 0) for x in m])}
    return out


def _comparison_summary(summaries: list) -> dict:
    keys = ["agents_saved", "time_saved_ms", "llm_calls_saved", "tokens_saved"]
    out = {"count": len(summaries)}
    for k in keys:
        out[f"avg_{k}"] = _avg([x.get(k, 0) for x in summaries])
    for k in ["same_priority", "same_severity", "same_team"]:
        out[f"{k}_rate"] = _avg([1 if x.get(k) else 0 for x in summaries])
    return out


def compare_summary(adaptive: dict, static: dict) -> dict:
    a, st = adaptive["metrics"], static["metrics"]
    ad, sd = adaptive.get("decision") or {}, static.get("decision") or {}
    return {
        "agents_saved": st["agents_run"] - a["agents_run"],
        "time_saved_ms": st["total_ms"] - a["total_ms"],
        "llm_calls_saved": st["llm_calls"] - a["llm_calls"],
        "tokens_saved": st["tokens"] - a["tokens"],
        "same_priority": ad.get("priority") == sd.get("priority"),
        "same_severity": ad.get("severity") == sd.get("severity"),
        "same_team": ad.get("team") == sd.get("team"),
        "adaptive_path": [e["agent"] for e in adaptive["execution_trace"] if e["status"] == "ran"],
    }


def save_comparison(bug: dict, adaptive: dict, static: dict, summary: dict) -> int:
    with SessionLocal() as s:
        c = Comparison(title=bug["title"], description=bug.get("description") or "",
                       adaptive=adaptive, static=static, summary=summary)
        s.add(c)
        s.commit()
        return c.id


def list_comparisons(limit: int = 200) -> list[dict]:
    with SessionLocal() as s:
        rows = s.scalars(select(Comparison).order_by(Comparison.id.desc()).limit(limit))
        return [{"id": c.id, "title": c.title, "created_at": c.created_at.isoformat() if c.created_at else None,
                 **(c.summary or {})} for c in rows]
