"""Central configuration. Everything reproducibility-related lives here (research-ready)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = BACKEND_DIR.parent
load_dotenv(REPO_ROOT / ".env")
load_dotenv(BACKEND_DIR / ".env")

# --- LLM (fixed for reproducibility) ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
LLM_TEMPERATURE = 0.0
LLM_TIMEOUT_S = 30
LLM_MAX_RETRIES = 1

# --- Database (SQLite locally if DATABASE_URL not set) ---
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'bugintel.db'}")
if DATABASE_URL.startswith("postgres://"):  # Render/Neon style URLs
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

# --- Pipeline ---
DEFAULT_MODE = os.getenv("PIPELINE_MODE", "adaptive")  # adaptive | static
# TF-IDF cosine thresholds — tune on data/duplicate_pairs.csv before reporting results
DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.75"))
POSSIBLE_DUPLICATE_THRESHOLD = float(os.getenv("POSSIBLE_DUPLICATE_THRESHOLD", "0.5"))
RANDOM_SEED = 42

# --- Files ---
DATA_DIR = REPO_ROOT / "data"
SEVERITY_DATASET = next((DATA_DIR / n for n in ["severity_dataset.csv", "severity_data.csv"] if (DATA_DIR / n).exists()),
                        DATA_DIR / "severity_dataset.csv")
BOOTSTRAP_DATASET = DATA_DIR / "bootstrap_bugs.csv"
MODULE_TEAM_MAP = DATA_DIR / "module_team_map.csv"
MODEL_PATH = BACKEND_DIR / "app" / "ml" / "severity_model.pkl"
REPORTS_DIR = BACKEND_DIR / "reports"

OPTIONAL_AGENTS = ["duplicate", "severity", "assignment"]
ALL_AGENTS = ["supervisor", "bug_analysis", "duplicate", "severity", "assignment", "engineering_decision"]
