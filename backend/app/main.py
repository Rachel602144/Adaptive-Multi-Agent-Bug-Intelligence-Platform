"""FastAPI entry (Rachel). Routes per contract; returns mock until graph is wired."""
import json
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Bug Intelligence Platform")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SAMPLE = json.loads((Path(__file__).parents[2] / "contracts" / "api_sample.json").read_text())


class BugIn(BaseModel):
    title: str
    description: str
    stack_trace: str | None = None
    environment: str | None = None


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/api/bugs")
def submit_bug(bug: BugIn):
    return {**SAMPLE, **bug.model_dump()}  # TODO: run LangGraph


@app.get("/api/bugs")
def list_bugs():
    return [SAMPLE]  # TODO: DB


@app.get("/api/bugs/{bug_id}")
def get_bug(bug_id: int):
    return SAMPLE  # TODO: DB


@app.get("/api/stats")
def stats():
    return {"total": 1, "by_severity": {"Critical": 1}, "duplicates": 0,
            "by_category": {"Backend": 1}, "by_team": {"Backend Team": 1}}  # TODO: DB
