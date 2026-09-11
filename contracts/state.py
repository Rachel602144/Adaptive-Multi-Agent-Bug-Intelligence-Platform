"""SHARED CONTRACT — do not edit without telling the whole team first."""
from typing import TypedDict, Optional


class BugState(TypedDict, total=False):
    # input
    bug_id: int
    title: str
    description: str
    stack_trace: Optional[str]
    environment: Optional[str]
    # supervisor
    selected_agents: list[str]  # subset of: duplicate, severity, assignment
    supervisor_reason: str
    # agent outputs
    analysis: Optional[dict]    # {category, module, nature, possible_cause, technical_info}
    duplicate: Optional[dict]   # {is_duplicate, match_id, match_title, score}
    severity: Optional[dict]    # {label: Critical|High|Medium|Low, confidence}
    assignment: Optional[dict]  # {team, rule}
    decision: Optional[dict]    # {priority, recommended_action, team, target_release,
                                #  estimated_resolution, possible_cause, explanation}
    # adaptive-path trace — powers the UI
    execution_trace: list[dict] # {agent, status: ran|skipped|failed, ms}
    errors: list[str]
