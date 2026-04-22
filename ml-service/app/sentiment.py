"""Arabic sentiment analysis using a pretrained Hugging Face model.

Model
-----
Default model: ``CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment``.

This is a BERT-base model released by CAMeL Lab (NYU Abu Dhabi). The
"-da-" variant was fine-tuned on dialectal Arabic in addition to MSA
(Modern Standard Arabic), so it handles the mixed MSA + dialect text that
SmartMENA campaigns are likely to receive. It emits one of three labels:
``positive``, ``negative``, ``neutral``.

We use the model **as-is** -- no fine-tuning, no additional training data.
This is a deliberate MVP choice: the CAMeL-Lab model is a strong Arabic
baseline and lets us ship a demoable sentiment endpoint without collecting
a labelled MENA marketing dataset.

Future work
-----------
The MVP does not cover dialect-specific fine-tuning. Reasonable follow-ups
once labelled SmartMENA data is available:

* fine-tune on dialect-specific marketing comments (Gulf vs Levantine vs
  Egyptian) to capture idioms the base model has weaker coverage on;
* domain-adapt on advertising feedback (product reviews, ad replies);
* calibrate confidence scores (temperature scaling) so that
  ``confidence`` reflects actual model accuracy.

Loading strategy
----------------
The pipeline is built lazily on the first request. This keeps `uvicorn`
boot instantaneous. The first ``/predict-sentiment`` call absorbs model
download (~500 MB on a cold machine) and initialisation (~5-10 s).
Subsequent calls reuse the in-memory instance via an LRU cache.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Tuple

from app.preprocess import clean_text

logger = logging.getLogger(__name__)


# Env-overrideable so researchers can swap in other Arabic sentiment models
# (e.g. MARBERT, AraBERT variants) without touching code.
MODEL_NAME = os.environ.get(
    "HF_SENTIMENT_MODEL",
    "CAMeL-Lab/bert-base-arabic-camelbert-da-sentiment",
)

# Map possible model-side labels to the three values our API schema allows.
# Different checkpoints use slightly different casings / abbreviations.
_LABEL_MAP = {
    "positive": "positive",
    "pos": "positive",
    "label_2": "positive",
    "negative": "negative",
    "neg": "negative",
    "label_0": "negative",
    "neutral": "neutral",
    "neu": "neutral",
    "label_1": "neutral",
}


class SentimentModelError(RuntimeError):
    """Raised when the sentiment model cannot be loaded or invoked.

    The FastAPI route translates this into a 503 so the client gets a clear
    'service not ready' signal rather than a 500.
    """


@lru_cache(maxsize=1)
def _get_pipeline():
    """Load the Hugging Face `transformers` pipeline exactly once."""
    try:
        from transformers import pipeline  # type: ignore
    except ImportError as exc:
        raise SentimentModelError(
            "transformers is not installed. Run `pip install -r requirements.txt`."
        ) from exc

    logger.info("Loading Arabic sentiment pipeline: %s", MODEL_NAME)
    try:
        # framework="pt" forces the PyTorch backend. transformers otherwise
        # auto-selects whichever framework it finds first, which on a machine
        # that happens to have TensorFlow installed will try Keras/TF and
        # fail with a "Keras 3 not supported" error. PyTorch is the actual
        # requirement in requirements.txt, so we pin it explicitly.
        return pipeline(
            task="sentiment-analysis",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
            framework="pt",
        )
    except Exception as exc:  # model download / auth / incompatibility
        raise SentimentModelError(
            f"Failed to load sentiment model '{MODEL_NAME}': {exc}"
        ) from exc


def analyze_sentiment(text: str) -> Tuple[str, float]:
    """Return ``(label, confidence)`` for a single input string.

    Raises
    ------
    ValueError
        If ``text`` is empty after preprocessing.
    SentimentModelError
        If the model cannot be loaded or inference fails.
    """
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")

    cleaned = clean_text(text)
    if not cleaned:
        # All characters were stripped (e.g. the user sent only URLs).
        raise ValueError("text contains no analysable content after cleaning")

    pipe = _get_pipeline()

    try:
        raw = pipe(cleaned, truncation=True, max_length=256)
    except Exception as exc:
        raise SentimentModelError(f"Inference failed: {exc}") from exc

    # transformers returns a list with a single dict for a single string.
    first = raw[0] if isinstance(raw, list) else raw

    raw_label = str(first.get("label", "")).strip().lower()
    label = _LABEL_MAP.get(raw_label, "neutral")
    score = float(first.get("score", 0.0))

    # Clamp to [0, 1] to satisfy the pydantic response schema even if the
    # pipeline ever returns a slightly out-of-range value.
    score = max(0.0, min(1.0, score))

    return label, round(score, 4)
