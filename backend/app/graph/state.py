"""Shared LangGraph state (mirrors contracts/state.py)."""
import operator
from typing import Annotated, Optional, TypedDict


class BugState(TypedDict, total=False):
    # input
    bug_id: int
    title: str
    description: str
    stack_trace: Optional[str]
    environment: Optional[str]
    mode: str                       # adaptive | static
    # supervisor
    selected_agents: list[str]      # subset of: duplicate, severity, assignment
    supervisor_reason: str
    short_circuit: bool             # duplicate found → skip severity + assignment
    # agent outputs
    analysis: Optional[dict]
    duplicate: Optional[dict]
    severity: Optional[dict]
    assignment: Optional[dict]
    decision: Optional[dict]
    # appended by every node (reducers)
    execution_trace: Annotated[list[dict], operator.add]
    errors: Annotated[list[str], operator.add]
