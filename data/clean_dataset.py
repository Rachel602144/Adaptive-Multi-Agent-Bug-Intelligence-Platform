import pandas as pd
import re
import sys

LABEL_MAP = {
    "blocker": "Critical",
    "critical": "Critical",
    "major": "High",
    "normal": "Medium",
    "minor": "Low",
    "trivial": "Low",
}

def norm(text):
    return re.sub(r"\s+", " ", str(text).strip().lower())

def mostly_english(text):
    text = str(text)
    letters = re.findall(r"[A-Za-z]", text)
    non_space = re.findall(r"\S", text)
    if not non_space:
        return False
    return len(letters) / len(non_space) >= 0.5

def main():
    if len(sys.argv) < 2:
        print("Usage: python clean_dataset.py original_file.csv")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = "severity_dataset.csv"

    df = pd.read_csv(input_file)

    required = ["Short Description", "Severity Label"]
    for column in required:
        if column not in df.columns:
            raise ValueError(f"Missing required column: {column}")

    out = pd.DataFrame()

    # Keep the original short description as both title and description,
    # matching the project's current cleaned-file format.
    out["title"] = df["Short Description"].fillna("").astype(str).str.strip()
    out["description"] = out["title"]

    # Map original Bugzilla severities to the four project classes.
    out["severity"] = (
        df["Severity Label"]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.lower()
        .map(LABEL_MAP)
    )

    # Drop enhancement, empty, and otherwise unmapped severity values.
    out = out[out["severity"].notna()]

    # Remove empty/very short titles.
    out = out[out["title"].map(lambda x: len(norm(x)) >= 10)]

    # Remove predominantly non-English rows.
    out = out[out["title"].map(mostly_english)]

    # Remove exact duplicate records.
    out["_key"] = (
        out["title"].map(norm)
        + " || "
        + out["description"].map(norm)
        + " || "
        + out["severity"].map(norm)
    )
    out = out.drop_duplicates("_key").drop(columns="_key")

    out.to_csv(output_file, index=False)

    print("Cleaning complete.")
    print("Original rows:", len(df))
    print("Final rows:", len(out))
    print("\nColumns:", list(out.columns))
    print("\nClass counts:")
    print(out["severity"].value_counts())

if __name__ == "__main__":
    main()
