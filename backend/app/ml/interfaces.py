"""Stable ML interfaces used by the graph. Keep these signatures."""
from typing import Optional

from app.ml import assignment, duplicate, severity


def predict_severity(text: str) -> dict:
    return severity.predict_severity(text)


def detect_duplicate(title: str, description: str, exclude: Optional[tuple] = None) -> dict:
    return duplicate.detect(title, description, exclude)


def assign_team(module: str, category: str, text: str = "") -> dict:
    return assignment.assign(module, category, text)
