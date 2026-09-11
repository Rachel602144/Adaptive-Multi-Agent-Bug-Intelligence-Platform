"""Gemini wrapper: JSON-only calls, usage tracking, never raises (callers fall back on None)."""
import json
import logging
import re
from typing import Optional

from app import config

log = logging.getLogger("llm")
_llm = None


def llm_available() -> bool:
    return bool(config.GOOGLE_API_KEY)


def _get_llm():
    global _llm
    if _llm is None:
        from langchain_google_genai import ChatGoogleGenerativeAI

        kwargs = dict(
            model=config.GEMINI_MODEL,
            temperature=config.LLM_TEMPERATURE,
            google_api_key=config.GOOGLE_API_KEY,
            timeout=config.LLM_TIMEOUT_S,
            max_retries=config.LLM_MAX_RETRIES,
        )
        try:  # disable "thinking" — short JSON tasks don't need it and it adds 5–20 s per call
            _llm = ChatGoogleGenerativeAI(**kwargs, thinking_budget=0)
        except Exception:
            _llm = ChatGoogleGenerativeAI(**kwargs)
    return _llm


def _extract_json(text: str) -> Optional[dict]:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def call_json(prompt: str) -> tuple[Optional[dict], dict]:
    """Returns (parsed_json_or_None, usage). usage = {llm_calls, tokens}."""
    usage = {"llm_calls": 0, "tokens": 0}
    if not llm_available():
        return None, usage
    for _ in range(2):  # one retry on bad JSON
        try:
            resp = _get_llm().invoke(prompt + "\n\nRespond with ONLY a valid JSON object, no markdown.")
            usage["llm_calls"] += 1
            meta = getattr(resp, "usage_metadata", None) or {}
            usage["tokens"] += int(meta.get("total_tokens", 0))
            content = resp.content if isinstance(resp.content, str) else "".join(
                p.get("text", "") if isinstance(p, dict) else str(p) for p in resp.content
            )
            data = _extract_json(content)
            if data is not None:
                return data, usage
        except Exception as e:  # network, quota, auth...
            log.warning("Gemini call failed: %s", e)
            return None, usage
    return None, usage
