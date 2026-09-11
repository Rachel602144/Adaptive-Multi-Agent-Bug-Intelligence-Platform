"""Duplicate Detection: TF-IDF cosine similarity against historical + previously submitted bugs."""
from typing import Callable, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app import config
from app.ml.severity import clean_text


class DuplicateIndex:
    def __init__(self):
        self.records: list[dict] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.matrix = None

    def build(self, records: list[dict]):
        """records: [{ref, raw_id, source, title, description, severity, module, team}] — ref like "H-12" / "BUG-5"."""
        self.records = records
        if not records:
            self.vectorizer, self.matrix = None, None
            return
        texts = [clean_text(f"{r['title']} {r['title']} {r.get('description') or ''}") for r in records]
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform(texts)

    def query(self, title: str, description: str, exclude: Optional[tuple] = None) -> dict:
        empty = {"is_duplicate": False, "possible_duplicate": False, "match_id": None, "match_source": None,
                 "match_title": None, "score": 0.0, "top_matches": []}
        if self.vectorizer is None:
            return empty
        vec = self.vectorizer.transform([clean_text(f"{title} {title} {description or ''}")])
        sims = cosine_similarity(vec, self.matrix)[0]
        order = sims.argsort()[::-1]
        top = []
        for i in order:
            r = self.records[i]
            if exclude and (r["source"], r["raw_id"]) == exclude:
                continue
            top.append((r, float(sims[i])))
            if len(top) == 3:
                break
        if not top:
            return empty
        best, score = top[0]
        return {
            "is_duplicate": score >= config.DUPLICATE_THRESHOLD,
            "possible_duplicate": config.POSSIBLE_DUPLICATE_THRESHOLD <= score < config.DUPLICATE_THRESHOLD,
            "match_id": best["ref"],
            "match_source": best["source"],
            "match_title": best["title"],
            "match_severity": best.get("severity"),
            "match_module": best.get("module"),
            "match_team": best.get("team"),
            "score": round(score, 3),
            "top_matches": [{"id": r["ref"], "source": r["source"], "title": r["title"], "score": round(s, 3)} for r, s in top],
        }


_index = DuplicateIndex()
_loader: Optional[Callable[[], list[dict]]] = None
_version = None


def set_loader(loader: Callable[[], list[dict]]):
    """DB layer registers a function returning all comparable bugs."""
    global _loader, _version
    _loader, _version = loader, None


def refresh(force: bool = False):
    global _version
    if _loader is None:
        return
    records = _loader()
    version = (len(records), records[-1]["ref"] if records else None)
    if force or version != _version:
        _index.build(records)
        _version = version


def detect(title: str, description: str, exclude: Optional[tuple] = None) -> dict:
    refresh()
    return _index.query(title, description, exclude)
