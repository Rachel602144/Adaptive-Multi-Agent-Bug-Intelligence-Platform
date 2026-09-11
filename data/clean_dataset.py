"""Clean a raw bug-severity dataset → data/severity_dataset.csv

Usage (from the repo root):
    python data/clean_dataset.py path/to/raw.csv

Handles:
- different column names (short_desc, summary, bug_severity, ...)
- description that is just a copy of the title (or starts with it)
- duplicate rows (prevents train/test leakage)
- label mapping → Critical / High / Medium / Low (drops enhancement etc.)
- empty / too-short / non-English text
Prints a report you can paste into the paper (rows before/after, class counts).
"""
import re
import sys
from pathlib import Path

import pandas as pd

TITLE_COLS = ["title", "short_desc", "summary", "bug_title", "subject", "name"]
DESC_COLS = ["description", "long_desc", "desc", "body", "text", "details", "comments"]
SEV_COLS = ["severity", "bug_severity", "priority_label", "label", "sev"]

LABEL_MAP = {
    "blocker": "Critical", "critical": "Critical", "s1": "Critical",
    "major": "High", "high": "High", "s2": "High",
    "normal": "Medium", "medium": "Medium", "s3": "Medium",
    "minor": "Low", "trivial": "Low", "low": "Low", "s4": "Low",
    # anything else (enhancement, n/a, --) is dropped
}


def pick(df: pd.DataFrame, options: list[str], required: bool) -> str | None:
    cols = {c.strip().lower(): c for c in df.columns}
    for o in options:
        if o in cols:
            return cols[o]
    if required:
        sys.exit(f"Could not find a column among {options}. Columns are: {list(df.columns)}")
    return None


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", str(text).lower())).strip()


def fix_description(title: str, desc: str) -> str:
    """Remove the copied title from the description."""
    t, d = norm(title), norm(desc)
    if not d or d == t:
        return ""  # pure copy → no extra information
    if d.startswith(t):
        # strip the leading title text from the original description
        rest = str(desc).strip()[len(str(title).strip()):].lstrip(" :.-\n\t")
        return rest if len(norm(rest)) > 3 else ""
    return str(desc).strip()


def is_mostly_english(text: str) -> bool:
    text = str(text)
    if not text:
        return True
    ascii_letters = sum(c.isascii() and c.isalpha() for c in text)
    letters = sum(c.isalpha() for c in text)
    return letters == 0 or ascii_letters / letters > 0.9


def main(raw_path: str):
    df = pd.read_csv(raw_path, low_memory=False)
    n0 = len(df)
    tcol, dcol, scol = pick(df, TITLE_COLS, True), pick(df, DESC_COLS, False), pick(df, SEV_COLS, True)
    print(f"Columns used → title: {tcol}, description: {dcol}, severity: {scol}")

    out = pd.DataFrame({
        "title": df[tcol].fillna("").astype(str).str.strip(),
        "description": df[dcol].fillna("").astype(str).str.strip() if dcol else "",
        "raw_severity": df[scol].fillna("").astype(str).str.strip().str.lower(),
    })
    out["severity"] = out["raw_severity"].map(LABEL_MAP)
    dropped_labels = out.loc[out["severity"].isna(), "raw_severity"].value_counts().head(10)
    out = out.dropna(subset=["severity"])
    n_label = len(out)

    copied = (out["description"].map(norm) == out["title"].map(norm)).sum()
    out["description"] = [fix_description(t, d) for t, d in zip(out["title"], out["description"])]

    out = out[out["title"].map(norm).str.len() >= 10]
    out = out[(out["title"] + " " + out["description"]).map(is_mostly_english)]
    n_text = len(out)

    out["_key"] = (out["title"] + " " + out["description"]).map(norm)
    conflicting = out.groupby("_key")["severity"].nunique()
    conflict_keys = set(conflicting[conflicting > 1].index)  # same text, different labels → unreliable
    out = out[~out["_key"].isin(conflict_keys)].drop_duplicates(subset=["_key"])
    n_final = len(out)

    dest = Path(__file__).resolve().parent / "severity_dataset.csv"
    out[["title", "description", "severity"]].to_csv(dest, index=False)

    print("\n=== Cleaning report (put this in the paper) ===")
    print(f"Raw rows:                         {n0}")
    print(f"After label mapping:              {n_label}   (dropped labels: { {k: int(v) for k, v in dropped_labels.items()} })")
    print(f"Descriptions that copied title:   {copied}  (cleared / trimmed)")
    print(f"After short/non-English filter:   {n_text}")
    print(f"Conflicting-label texts removed:  {len(conflict_keys)}")
    print(f"Final rows (duplicates removed):  {n_final}")
    print("\nClass counts:")
    print(out["severity"].value_counts().to_string())
    print(f"\nSaved → {dest}")
    if out["severity"].value_counts().min() < 50:
        print("\nWARNING: a class has < 50 rows — results for that class will be unreliable.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage: python data/clean_dataset.py path/to/raw.csv")
    main(sys.argv[1])
