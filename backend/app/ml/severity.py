"""Severity Prediction: TF-IDF + Logistic Regression model, keyword fallback if model missing."""
import logging
import re

from app import config

log = logging.getLogger("severity")
LABELS = ["Critical", "High", "Medium", "Low"]
_model = None
_model_loaded = False

_RULES = [
    ("Critical", ["crash", "data loss", "security", "outage", "down", "500", "cannot login", "can't login", "payment fail",
                  "corrupt", "exposed", "all users", "production", "blocker", "unable to login", "login fails"]),
    ("High", ["error", "exception", "fails", "failure", "broken", "timeout", "not working", "incorrect", "wrong"]),
    ("Low", ["typo", "misspelled", "alignment", "cosmetic", "color", "font", "spelling", "padding", "tooltip"]),
]


def clean_text(text: str) -> str:
    text = (text or "").lower()
    text = re.sub(r"https?://\S+", " url ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _load():
    global _model, _model_loaded
    if not _model_loaded:
        _model_loaded = True
        if config.MODEL_PATH.exists():
            import joblib

            _model = joblib.load(config.MODEL_PATH)
        else:
            log.warning("severity_model.pkl not found — using keyword fallback. Run: python -m app.ml.train_severity")
    return _model


def rule_severity(text: str) -> dict:
    t = (text or "").lower()
    for label, kws in _RULES:
        if any(k in t for k in kws):
            return {"label": label, "confidence": 0.5, "source": "rules"}
    return {"label": "Medium", "confidence": 0.4, "source": "rules"}


def predict_severity(text: str) -> dict:
    model = _load()
    if model is None:
        return rule_severity(text)
    proba = model.predict_proba([clean_text(text)])[0]
    classes = list(model.classes_)
    i = int(proba.argmax())
    return {
        "label": classes[i],
        "confidence": round(float(proba[i]), 3),
        "probabilities": {c: round(float(p), 3) for c, p in zip(classes, proba)},
        "source": "model",
    }
