"""Khushi's functions — signatures frozen, bodies are heuristic stand-ins
for the trained model / LLM calls the real pipeline will use once the
severity dataset (train_severity.py) and Gemini key are wired in."""
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

_CRITICAL_KW = ("crash", "data loss", "corrupt", "security breach", "500", "outage", "down")
_HIGH_KW = ("error", "exception", "fail", "auth", "payment", "unauthorized", "traceback")
_LOW_KW = ("typo", "css", "align", "color", "colour", "font", "spacing", "label", "cosmetic")

# In-memory corpus of previously-seen bugs for duplicate matching.
_HISTORICAL: list[tuple[int, str, str]] = []


def predict_severity(text: str) -> dict:
    lowered = text.lower()
    if any(kw in lowered for kw in _CRITICAL_KW):
        return {"label": "Critical", "confidence": 0.88}
    if any(kw in lowered for kw in _HIGH_KW):
        return {"label": "High", "confidence": 0.78}
    if any(kw in lowered for kw in _LOW_KW):
        return {"label": "Low", "confidence": 0.72}
    return {"label": "Medium", "confidence": 0.6}


def detect_duplicate(title: str, description: str) -> dict:
    if not _HISTORICAL:
        return {"is_duplicate": False, "match_id": None, "match_title": None, "score": 0.0}

    # Description carries the actual symptom and is weighted higher than title —
    # duplicate reports are routinely titled differently but describe the same fault.
    query = f"{title} {description} {description}"
    corpus = [f"{t} {d} {d}" for _, t, d in _HISTORICAL] + [query]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
    matrix = vectorizer.fit_transform(corpus)
    scores = cosine_similarity(matrix[-1], matrix[:-1])[0]

    best_idx = int(scores.argmax())
    best_score = float(scores[best_idx])
    match_id, match_title, _ = _HISTORICAL[best_idx]

    return {
        "is_duplicate": best_score > 0.85,
        "match_id": match_id,
        "match_title": match_title,
        "score": round(best_score, 2),
    }


def record_for_duplicate_matching(bug_id: int, title: str, description: str) -> None:
    """Called after a bug finishes processing so later submissions can match against it."""
    _HISTORICAL.append((bug_id, title, description))


MODULE_TEAM = {
    "Authentication": "Backend Team",
    "Payment": "Backend Team",
    "Database": "Database Team",
    "API": "Backend Team",
    "Notifications": "Backend Team",
    "Search": "Backend Team",
    "Performance": "DevOps Team",
    "UI": "Frontend Team",
}


def assign_team(module: str, category: str) -> dict:
    if module in MODULE_TEAM:
        return {"team": MODULE_TEAM[module], "rule": f"{module} -> {MODULE_TEAM[module]}"}
    if category == "Frontend":
        return {"team": "Frontend Team", "rule": "category:Frontend -> Frontend Team"}
    return {"team": "Backend Team", "rule": "default"}
