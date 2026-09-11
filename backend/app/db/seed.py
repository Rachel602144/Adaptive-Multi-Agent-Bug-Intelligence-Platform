"""Create tables and seed teams, modules and historical bugs.

Run from backend/:  python -m app.db.seed          (skips if already seeded)
                    python -m app.db.seed --reset  (drops everything first)
Historical bugs come from data/severity_dataset.csv (Khushi) or data/bootstrap_bugs.csv (dev only).
"""
import sys

import pandas as pd
from sqlalchemy import func, select

from app import config
from app.db.database import Base, HistoricalBug, Module, SessionLocal, Team, engine, init_db
from app.knowledge import MODULES, TEAMS, keyword_module
from app.ml.train_severity import LABEL_MAP

MAX_HISTORICAL = 5000


def seed(reset: bool = False):
    if reset:
        Base.metadata.drop_all(engine)
    init_db()
    with SessionLocal() as s:
        if s.scalar(select(func.count(HistoricalBug.id))):
            print("Already seeded (use --reset to reseed).")
            return
        for name, desc in TEAMS.items():
            s.add(Team(name=name, description=desc))
        for team in {t for t, _ in MODULES.values()} - set(TEAMS):
            s.add(Team(name=team, description=""))
        for name, (team, kws) in MODULES.items():
            s.add(Module(name=name, team=team, keywords=", ".join(kws)))

        path = config.SEVERITY_DATASET if config.SEVERITY_DATASET.exists() else config.BOOTSTRAP_DATASET
        df = pd.read_csv(path)
        df.columns = [c.strip().lower() for c in df.columns]
        df["severity"] = df["severity"].astype(str).str.strip().str.lower().map(LABEL_MAP)
        df = df.dropna(subset=["severity", "title"])
        if len(df) > MAX_HISTORICAL:
            df = df.sample(MAX_HISTORICAL, random_state=config.RANDOM_SEED)
        for _, row in df.iterrows():
            desc = str(row.get("description", "") or "")
            module, _ = keyword_module(f"{row['title']} {desc}")
            s.add(HistoricalBug(title=str(row["title"]), description=desc, severity=row["severity"],
                                module=module, team=MODULES[module][0], source=path.name))
        s.commit()
        print(f"Seeded {len(TEAMS)} teams, {len(MODULES)} modules, {len(df)} historical bugs from {path.name}")


if __name__ == "__main__":
    seed(reset="--reset" in sys.argv)
