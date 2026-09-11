"""Gemini wrapper: JSON-only calls, usage tracking, never raises (callers fall back on None).

Free-tier quotas are per (project key, model). To stretch them, set in .env:
    GOOGLE_API_KEYS=key1,key2,key3          (keys from different Google projects)
    GEMINI_MODELS=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash
On a 429 / quota error the wrapper moves to the next (key, model) pair and remembers it.
"""
import json
import logging
import os
import re
import threading
import time
from typing import Optional

from app import config

log = logging.getLogger("llm")

_KEYS = [k.strip() for k in os.getenv("GOOGLE_API_KEYS", "").split(",") if k.strip()] or (
    [config.GOOGLE_API_KEY] if config.GOOGLE_API_KEY else [])
_MODELS = [m.strip() for m in os.getenv("GEMINI_MODELS", "").split(",") if m.strip()] or [config.GEMINI_MODEL]
_COMBOS = [(k, m) for m in _MODELS for k in _KEYS]  # same model across all keys first, then next model

# Fallback provider after all Gemini combos: OpenRouter free models (OpenAI-compatible API)
_OR_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
_OR_MODELS = [m.strip() for m in os.getenv(
    "OPENROUTER_MODELS", "openrouter/free,google/gemma-4-31b-it:free").split(",") if m.strip()] if _OR_KEY else []
_or_exhausted_until: dict = {}

_clients: dict = {}
_exhausted_until: dict = {}  # combo index -> unix time when it may be retried
_current = 0
_lock = threading.Lock()


def llm_available() -> bool:
    return bool(_COMBOS or _OR_MODELS)


def status() -> dict:
    now = time.time()
    return {"keys": len(_KEYS), "models": _MODELS, "combos": len(_COMBOS),
            "exhausted": sum(1 for t in _exhausted_until.values() if t > now),
            "current_model": _COMBOS[_current][1] if _COMBOS else None,
            "openrouter_models": _OR_MODELS,
            "openrouter_exhausted": sum(1 for t in _or_exhausted_until.values() if t > now)}


def _client(i: int):
    if i not in _clients:
        from langchain_google_genai import ChatGoogleGenerativeAI

        key, model = _COMBOS[i]
        kwargs = dict(model=model, temperature=config.LLM_TEMPERATURE, google_api_key=key,
                      timeout=config.LLM_TIMEOUT_S, max_retries=0)
        try:  # disable "thinking" — short JSON tasks don't need it and it adds 5–20 s per call
            _clients[i] = ChatGoogleGenerativeAI(**kwargs, thinking_budget=0)
        except Exception:
            _clients[i] = ChatGoogleGenerativeAI(**kwargs)
    return _clients[i]


def _is_quota_error(e: Exception) -> bool:
    s = str(e)
    return "429" in s or "RESOURCE_EXHAUSTED" in s or "quota" in s.lower()


def _is_model_error(e: Exception) -> bool:
    s = str(e)
    return "404" in s or "NOT_FOUND" in s or "not found" in s.lower()


def _extract_json(text: str) -> Optional[dict]:
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip())
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def _text(resp) -> str:
    c = resp.content
    return c if isinstance(c, str) else "".join(p.get("text", "") if isinstance(p, dict) else str(p) for p in c)


def _gemini_call_json(prompt: str) -> tuple[Optional[dict], dict]:
    global _current
    usage = {"llm_calls": 0, "tokens": 0, "model": None}
    if not _COMBOS:
        return None, usage
    tried = 0
    bad_json_retry = True
    while tried < len(_COMBOS):
        with _lock:
            i = _current
        if _exhausted_until.get(i, 0) > time.time():
            with _lock:
                _current = (i + 1) % len(_COMBOS)
            tried += 1
            continue
        try:
            resp = _client(i).invoke(prompt)
            usage["llm_calls"] += 1
            usage["model"] = _COMBOS[i][1]
            usage["tokens"] += int((getattr(resp, "usage_metadata", None) or {}).get("total_tokens", 0))
            data = _extract_json(_text(resp))
            if data is not None:
                return data, usage
            if bad_json_retry:
                bad_json_retry = False
                continue
            return None, usage
        except Exception as e:
            if _is_quota_error(e) or _is_model_error(e):
                cooldown = 3600 if ("PerDay" in str(e) or _is_model_error(e)) else 60
                _exhausted_until[i] = time.time() + cooldown
                log.warning("Gemini %s on %s (key #%d) — switching. %s", "quota" if _is_quota_error(e) else "model error",
                            _COMBOS[i][1], _KEYS.index(_COMBOS[i][0]) + 1, str(e)[:120])
                with _lock:
                    _current = (i + 1) % len(_COMBOS)
                tried += 1
                continue
            log.warning("Gemini call failed: %s", str(e)[:300])
            return None, usage
    log.warning("All Gemini keys/models exhausted.")
    return None, usage


def _openrouter_call_json(prompt: str) -> tuple[Optional[dict], dict]:
    import httpx

    usage = {"llm_calls": 0, "tokens": 0, "model": None}
    for m in _OR_MODELS:
        if _or_exhausted_until.get(m, 0) > time.time():
            continue
        try:
            r = httpx.post("https://openrouter.ai/api/v1/chat/completions",
                           headers={"Authorization": f"Bearer {_OR_KEY}"},
                           json={"model": m, "temperature": config.LLM_TEMPERATURE,
                                 "messages": [{"role": "user", "content": prompt}]},
                           timeout=config.LLM_TIMEOUT_S)
            if r.status_code == 429 or r.status_code == 402:
                _or_exhausted_until[m] = time.time() + (3600 if "day" in r.text.lower() else 60)
                log.warning("OpenRouter %s on %s — trying next.", r.status_code, m)
                continue
            if r.status_code >= 400:
                log.warning("OpenRouter error %s on %s: %s", r.status_code, m, r.text[:200])
                continue
            body = r.json()
            usage["llm_calls"] += 1
            usage["model"] = body.get("model", m)
            usage["tokens"] += int((body.get("usage") or {}).get("total_tokens", 0))
            data = _extract_json(body["choices"][0]["message"]["content"] or "")
            if data is not None:
                return data, usage
        except Exception as e:
            log.warning("OpenRouter call failed on %s: %s", m, str(e)[:200])
    return None, usage


def call_json(prompt: str) -> tuple[Optional[dict], dict]:
    """Gemini keys/models → OpenRouter free models → None (caller uses rules).
    Returns (parsed_json_or_None, usage). usage = {llm_calls, tokens, model}."""
    prompt += "\n\nRespond with ONLY a valid JSON object, no markdown."
    data, usage = _gemini_call_json(prompt)
    if data is not None or not _OR_MODELS:
        if data is None:
            log.warning("No LLM available — using rule-based fallbacks.")
        return data, usage
    data2, usage2 = _openrouter_call_json(prompt)
    total = {"llm_calls": usage["llm_calls"] + usage2["llm_calls"], "tokens": usage["tokens"] + usage2["tokens"],
             "model": usage2["model"] or usage["model"]}
    if data2 is None:
        log.warning("All LLM providers exhausted — using rule-based fallbacks.")
    return data2, total
