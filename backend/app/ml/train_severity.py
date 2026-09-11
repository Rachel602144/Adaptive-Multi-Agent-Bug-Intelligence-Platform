"""Train the severity model.

Run from backend/:  python -m app.ml.train_severity
Uses data/severity_dataset.csv (Khushi) — falls back to data/bootstrap_bugs.csv (dev only, NOT for the paper).
Outputs: app/ml/severity_model.pkl, reports/severity_metrics.json, reports/confusion_matrix.png
"""
import json
import sys

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from app import config
from app.ml.severity import LABELS, clean_text

LABEL_MAP = {
    "blocker": "Critical", "critical": "Critical",
    "major": "High", "high": "High",
    "normal": "Medium", "medium": "Medium",
    "minor": "Low", "trivial": "Low", "low": "Low",
}


def load_dataset() -> tuple[pd.DataFrame, str]:
    path = config.SEVERITY_DATASET if config.SEVERITY_DATASET.exists() else config.BOOTSTRAP_DATASET
    df = pd.read_csv(path)
    df.columns = [c.strip().lower() for c in df.columns]
    df["severity"] = df["severity"].astype(str).str.strip().str.lower().map(LABEL_MAP)
    df = df.dropna(subset=["severity"])
    df["text"] = (df["title"].fillna("") + " " + df.get("description", pd.Series("", index=df.index)).fillna("")).map(clean_text)
    df = df[df["text"].str.len() > 5].drop_duplicates(subset=["text"])
    return df, path.name


def build_pipeline() -> Pipeline:
    return Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000, sublinear_tf=True)),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=config.RANDOM_SEED)),
    ])


def main():
    df, source = load_dataset()
    print(f"Dataset: {source} — {len(df)} rows")
    print(df["severity"].value_counts().to_string())
    if df["severity"].nunique() < 2:
        sys.exit("Need at least 2 severity classes.")

    stratify = df["severity"] if df["severity"].value_counts().min() >= 2 else None
    X_tr, X_te, y_tr, y_te = train_test_split(
        df["text"], df["severity"], test_size=0.2, random_state=config.RANDOM_SEED, stratify=stratify
    )
    model = build_pipeline().fit(X_tr, y_tr)
    pred = model.predict(X_te)

    labels = [l for l in LABELS if l in set(df["severity"])]
    metrics = {
        "dataset": source,
        "rows": int(len(df)),
        "class_counts": df["severity"].value_counts().to_dict(),
        "test_size": int(len(y_te)),
        "accuracy": round(float(accuracy_score(y_te, pred)), 4),
        "macro_f1": round(float(f1_score(y_te, pred, average="macro")), 4),
        "per_class": classification_report(y_te, pred, labels=labels, output_dict=True, zero_division=0),
        "confusion_matrix": {"labels": labels, "matrix": confusion_matrix(y_te, pred, labels=labels).tolist()},
    }
    print(f"\nAccuracy: {metrics['accuracy']}  Macro-F1: {metrics['macro_f1']}")
    print(classification_report(y_te, pred, labels=labels, zero_division=0))

    # Final model trained on all data
    final = build_pipeline().fit(df["text"], df["severity"])
    config.MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(final, config.MODEL_PATH)
    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / "severity_metrics.json").write_text(json.dumps(metrics, indent=2))

    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        cm = np.array(metrics["confusion_matrix"]["matrix"])
        fig, ax = plt.subplots(figsize=(5, 4))
        ax.imshow(cm, cmap="Blues")
        ax.set_xticks(range(len(labels)), labels)
        ax.set_yticks(range(len(labels)), labels)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        for i in range(len(labels)):
            for j in range(len(labels)):
                ax.text(j, i, cm[i, j], ha="center", va="center")
        ax.set_title(f"Severity confusion matrix (acc {metrics['accuracy']})")
        fig.tight_layout()
        fig.savefig(config.REPORTS_DIR / "confusion_matrix.png", dpi=150)
    except ImportError:
        print("matplotlib not installed — skipped confusion_matrix.png")

    print(f"\nSaved model → {config.MODEL_PATH}\nSaved metrics → {config.REPORTS_DIR}")


if __name__ == "__main__":
    main()
