"""Domain knowledge: modules, owning teams, keywords. Overridden by data/module_team_map.csv if present."""
import csv
import re

from app import config

DEFAULT_MODULES = {
    "Authentication": ("Backend Team", ["login", "logout", "password", "auth", "token", "session", "oauth", "sso", "sign in", "signup", "jwt", "otp"]),
    "Payment": ("Backend Team", ["payment", "checkout", "invoice", "refund", "card", "billing", "transaction", "upi", "stripe"]),
    "UI": ("Frontend Team", ["button", "layout", "css", "alignment", "typo", "font", "color", "display", "render", "responsive", "icon", "modal", "screen", "misspelled", "spelling"]),
    "Database": ("Database Team", ["database", "sql", "query", "deadlock", "migration", "index", "postgres", "mysql", "data loss", "corrupt"]),
    "API": ("Backend Team", ["api", "endpoint", "500", "404", "request", "response", "timeout", "rest", "json", "http"]),
    "Notifications": ("Backend Team", ["email", "notification", "sms", "push", "alert", "mail"]),
    "Search": ("Backend Team", ["search", "filter", "sort", "results", "autocomplete"]),
    "Performance": ("DevOps Team", ["slow", "latency", "memory", "cpu", "leak", "performance", "load", "hang", "freeze"]),
    "Security": ("Security Team", ["xss", "csrf", "injection", "vulnerability", "permission", "unauthorized", "exposed", "security"]),
    "Infrastructure": ("DevOps Team", ["deploy", "server", "crash", "docker", "build", "outage", "down"]),
}

CORE_MODULES = {"Authentication", "Payment", "Database", "Security"}

TEAMS = {
    "Backend Team": "Server-side services, APIs, auth, payments",
    "Frontend Team": "Web UI and client-side code",
    "Database Team": "Schemas, queries, data integrity",
    "DevOps Team": "Infrastructure, deployment, performance",
    "Security Team": "Vulnerabilities and access control",
}


def load_modules() -> dict[str, tuple[str, list[str]]]:
    path = config.MODULE_TEAM_MAP
    if not path.exists():
        return DEFAULT_MODULES
    modules = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("module") or "").strip()
            team = (row.get("team") or "").strip()
            if not name or not team:
                continue
            kws = [k.strip().lower() for k in (row.get("keywords") or "").replace(";", ",").split(",") if k.strip()]
            modules[name] = (team if team.lower().endswith("team") else f"{team} Team", kws)
    return modules or DEFAULT_MODULES


MODULES = load_modules()


def keyword_module(text: str) -> tuple[str, int]:
    """Best module by keyword hits. Returns (module, hits)."""
    text = text.lower()
    best, best_hits = "API", 0
    for name, (_, kws) in MODULES.items():
        hits = sum(1 for k in kws if re.search(rf"\b{re.escape(k)}", text))
        if hits > best_hits:
            best, best_hits = name, hits
    return best, best_hits


def category_for_module(module: str) -> str:
    return {"UI": "Frontend", "Database": "Database", "Performance": "Performance",
            "Security": "Security", "Infrastructure": "Infrastructure"}.get(module, "Backend")
