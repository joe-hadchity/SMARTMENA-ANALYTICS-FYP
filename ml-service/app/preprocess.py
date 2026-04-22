"""Preprocessing helpers shared by training and inference.

Two concerns live here:

1.  ROI features: `to_feature_frame` turns an HTTP payload into the DataFrame
    shape the sklearn pipeline expects. This keeps training and inference in
    sync (no "train/serve skew").

2.  Arabic text normalisation: `clean_text` applies a small, well-documented
    set of transformations that Arabic NLP literature commonly uses as
    preprocessing. We keep it deliberately light -- the BERT tokenizer does
    most of the work, so heavy stemming or stop-word removal would harm
    performance on a model we do not fine-tune.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any, Dict, List

import pandas as pd


# ===========================================================================
# ROI feature helpers
# ---------------------------------------------------------------------------
# Feature order matters: the same order is used at training time (see
# app/train_roi.py) and at inference time. Keep them in sync through the
# NUMERIC_FEATURES / CATEGORICAL_FEATURES constants and nowhere else.
# ===========================================================================
NUMERIC_FEATURES: List[str] = [
    "budget",
    "audience_size",
    "posting_hour",
    "sentiment_score",
    "holiday_flag",
]
CATEGORICAL_FEATURES: List[str] = ["platform", "content_type", "region"]
ALL_FEATURES: List[str] = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def to_feature_frame(payload: Dict[str, Any]) -> pd.DataFrame:
    """Build a single-row DataFrame with every feature the ROI model expects.

    Missing fields fall back to neutral defaults so the function never raises.
    The FastAPI pydantic schema is the real source of input validation; this
    helper just guarantees column presence and dtype at inference time.
    """
    row = {
        "budget": float(payload.get("budget") or 0.0),
        "audience_size": int(payload.get("audience_size") or 0),
        "posting_hour": int(payload.get("posting_hour", 18)),
        "sentiment_score": float(payload.get("sentiment_score", 0.0)),
        "holiday_flag": int(payload.get("holiday_flag", 0)),
        "platform": str(payload.get("platform") or "unknown"),
        "content_type": str(payload.get("content_type") or "unknown"),
        "region": str(payload.get("region") or "unknown"),
    }
    return pd.DataFrame([row], columns=ALL_FEATURES)


# ===========================================================================
# Arabic text normalisation (used by sentiment.py)
# ---------------------------------------------------------------------------
# References (for the academic writeup):
#   - Habash, "Introduction to Arabic Natural Language Processing" (2010)
#   - CAMeL Tools (camel-tools.readthedocs.io)
# The steps below are a minimal subset of what those resources recommend,
# chosen so that casing / spacing / diacritics variation does not cause the
# tokenizer to produce different sub-words for what is essentially the same
# input.
# ===========================================================================

# Tashkeel / diacritics (harakat) and other superscript marks.
# These are phonetic hints that native readers usually omit; keeping them
# forces the tokenizer to treat "كَتَبَ" and "كتب" as different tokens.
_ARABIC_DIACRITICS = re.compile(
    r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]"
)

# Tatweel (kashida) is a decorative elongation character, not a letter.
_TATWEEL = "\u0640"

# Common letter variants folded into a single canonical form.
_ALEF_VARIANTS = re.compile(r"[إأآٱ]")   # -> ا
_ALEF_MAKSURA = re.compile(r"ى")         # -> ي
_TA_MARBUTA_FINAL = re.compile(r"ة\b")   # often interchangeable with ه word-finally

# Strip URLs, user mentions, and hashtag characters (the word after '#'
# is kept). Social-media artefacts would otherwise carry no sentiment signal.
_URL = re.compile(r"https?://\S+|www\.\S+")
_MENTION = re.compile(r"@\w+")
_HASHTAG_CHAR = re.compile(r"#")

# Collapse runs of identical characters (e.g. "راااائع" -> "رائع"). Users
# lengthen vowels for emphasis; the base form carries the same sentiment.
_ELONGATION = re.compile(r"(.)\1{2,}")

_MULTI_WS = re.compile(r"\s+")


def normalize_arabic(text: str) -> str:
    """Apply the light, well-known Arabic text normalisation steps."""
    text = unicodedata.normalize("NFKC", text)
    text = _ARABIC_DIACRITICS.sub("", text)
    text = text.replace(_TATWEEL, "")
    text = _ALEF_VARIANTS.sub("ا", text)
    text = _ALEF_MAKSURA.sub("ي", text)
    text = _TA_MARBUTA_FINAL.sub("ه", text)
    text = _ELONGATION.sub(r"\1\1", text)  # keep at most two of a char
    return text


def clean_text(text: str) -> str:
    """Clean a raw user-supplied string before feeding it to the model."""
    if not text:
        return ""
    text = _URL.sub(" ", text)
    text = _MENTION.sub(" ", text)
    text = _HASHTAG_CHAR.sub(" ", text)
    text = normalize_arabic(text)
    text = _MULTI_WS.sub(" ", text).strip()
    return text
