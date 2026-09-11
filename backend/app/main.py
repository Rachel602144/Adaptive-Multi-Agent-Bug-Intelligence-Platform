"""FastAPI entry point.  Run from backend/:  uvicorn app.main:app --reload"""
import logging
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import config, llm
from app.db import repository
from app.db.database import init_db
from app.graph.graph import run_triage
from app.graph.serialize import serialize_state
from app.knowledge import MODULES, TEAMS
from app.ml import duplicate

logging.basicConfig(level=logging.INFO)
app = FastAPI(title="Adaptive Multi-Agent Bug Intelligence Platform", version="1.0")
origins = ["*"] if config.FRONTEND_ORIGIN == "*" else [o.strip() for o in config.FRONTEND_ORIGIN.split(",")]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def startup():
    init_db()
    duplicate.set_loader(repository.load_comparable_bugs)
    duplicate.refresh(force=True)  # build the TF-IDF index now, not on the first request
    if llm.llm_available():  # build the Gemini client now (no API call — saves free-tier quota)
        try:
            llm._client(0)
        except Exception as e:
            logging.warning("Gemini client init failed: %s", e)


class BugIn(BaseModel):
    title: str = Field(min_length=3, max_length=300)
    description: str = Field(default="", max_length=10000)
    stack_trace: Optional[str] = Field(default=None, max_length=20000)
    environment: Optional[str] = Field(default=None, max_length=500)
    mode: Optional[Literal["adaptive", "static"]] = None


@app.get("/health")
def health():
    return {"ok": True, "llm": llm.llm_available(), "gemini": llm.status(), "mode": config.DEFAULT_MODE}


@app.post("/api/bugs")
def submit_bug(bug: BugIn):
    mode = bug.mode or config.DEFAULT_MODE
    bug_id = repository.create_bug(bug.model_dump(), mode)
    state = run_triage({**bug.model_dump(), "bug_id": bug_id}, mode=mode)
    return repository.save_result(bug_id, state)


@app.post("/api/compare")
def compare(bug: BugIn):
    """Research ablation: run the same bug through adaptive and static pipelines.
    Not stored as bugs (so the two runs never match each other as duplicates); saved to `comparisons`."""
    data = {k: v for k, v in bug.model_dump().items() if k != "mode"}
    adaptive = serialize_state(None, run_triage({**data, "bug_id": None}, mode="adaptive"))
    static = serialize_state(None, run_triage({**data, "bug_id": None}, mode="static"))
    summary = repository.compare_summary(adaptive, static)
    comparison_id = repository.save_comparison(data, adaptive, static, summary)
    return {"comparison_id": comparison_id, "adaptive": adaptive, "static": static, "summary": summary}


@app.get("/api/comparisons")
def comparisons():
    return repository.list_comparisons()


@app.get("/api/bugs")
def list_bugs():
    return repository.list_bugs()


@app.get("/api/bugs/{bug_id}")
def get_bug(bug_id: int):
    result = repository.get_bug(bug_id)
    if not result:
        raise HTTPException(404, "Bug not found")
    return result


@app.get("/api/stats")
def stats():
    return repository.stats()


@app.get("/api/teams")
def teams():
    return {"teams": TEAMS, "modules": {m: {"team": t, "keywords": k} for m, (t, k) in MODULES.items()}}
