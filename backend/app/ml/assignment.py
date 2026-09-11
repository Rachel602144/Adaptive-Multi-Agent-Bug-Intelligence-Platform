"""Assignment: deterministic module → team rules (knowledge representation)."""
from app.knowledge import MODULES, keyword_module


def assign(module: str, category: str, text: str = "") -> dict:
    if module in MODULES:
        team = MODULES[module][0]
        return {"team": team, "rule": f"{module} → {team}", "matched_on": "module"}
    # module unknown to the rule table → infer from text keywords
    inferred, hits = keyword_module(f"{module} {category} {text}")
    team = MODULES[inferred][0]
    return {"team": team, "rule": f"{inferred} → {team} (keyword match, {hits} hits)", "matched_on": "keywords"}
