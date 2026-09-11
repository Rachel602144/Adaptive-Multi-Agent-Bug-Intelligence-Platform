"""Khushi's functions — STUBS. Replace bodies, keep signatures exactly."""


def predict_severity(text: str) -> dict:
    return {"label": "Medium", "confidence": 0.5}


def detect_duplicate(title: str, description: str) -> dict:
    return {"is_duplicate": False, "match_id": None, "match_title": None, "score": 0.0}


def assign_team(module: str, category: str) -> dict:
    return {"team": "Backend Team", "rule": "default"}
