"""ROI prediction (trained sklearn pipeline + transparent heuristic fallback).

At inference time:

* If ``ml-service/models/roi_model.joblib`` exists, we load the bundle
  produced by ``app/train_roi.py`` and return the pipeline's predictions.
* If it does not, we fall back to a simple hand-coded heuristic so the
  endpoint still answers 200 while the student / reviewer runs training.
  The heuristic returns a noticeably lower confidence score so consumers
  can tell the two paths apart.

Confidence score
----------------
GradientBoosting gives point predictions with no built-in uncertainty, so we
use the holdout R^2 of the ``roi`` target as a stand-in and clip it to a
safe [0.10, 0.95] band. This is a deliberately simple proxy and is
documented as future work: a proper implementation would use quantile
regression or a bootstrap ensemble to produce per-sample intervals.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional

import joblib

from app.preprocess import to_feature_frame


ML_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH: Path = ML_ROOT / "models" / "roi_model.joblib"


# Used by the fallback heuristic when the joblib artifact is missing. The
# values mirror the rough platform ranking used to generate the synthetic
# dataset, so the fallback stays directionally correct.
PLATFORM_MULTIPLIER = {
    "tiktok": 1.25,
    "instagram": 1.15,
    "facebook": 1.00,
    "twitter": 0.90,
}


@lru_cache(maxsize=1)
def _load_bundle() -> Optional[dict]:
    """Load the joblib bundle once. Returns None if the file is missing."""
    if not MODEL_PATH.exists():
        return None
    bundle = joblib.load(MODEL_PATH)
    # Basic shape check so a stale / hand-edited artifact can't crash predict.
    if not isinstance(bundle, dict) or "pipeline" not in bundle:
        return None
    return bundle


def _heuristic(payload: Dict) -> Dict[str, float]:
    """Transparent fallback so /predict-roi works before train_roi is run."""
    base = 1.4
    mult = PLATFORM_MULTIPLIER.get(str(payload.get("platform", "")).lower(), 1.0)
    budget_bump = 1.0 + min(0.3, float(payload.get("budget", 0)) / 10_000.0)
    sentiment = float(payload.get("sentiment_score", 0.0))
    holiday = int(payload.get("holiday_flag", 0))

    roi = base * mult * budget_bump * (1.0 + 0.2 * sentiment) * (1.0 + 0.15 * holiday)
    engagement = 0.04 * mult * (1.0 + 0.15 * holiday)

    return {
        "predicted_roi": round(float(roi), 4),
        "predicted_engagement": round(float(engagement), 4),
        "confidence_score": 0.40,  # low by design -- this is a fallback
    }


def _clip(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def predict_roi(payload: Dict) -> Dict[str, float]:
    """Return ``predicted_roi``, ``predicted_engagement`` and ``confidence_score``.

    ``payload`` is expected to be the dict form of ``ROIRequest``. Extra
    keys are tolerated so future schema additions don't break inference.
    """
    bundle = _load_bundle()

    if bundle is None:
        return _heuristic(payload)

    pipeline = bundle["pipeline"]
    targets = bundle.get("targets", ["engagement_rate", "roi"])
    metrics = bundle.get("metrics", {})

    frame = to_feature_frame(payload)
    raw = pipeline.predict(frame)[0]

    predicted = dict(zip(targets, [float(v) for v in raw]))

    engagement = _clip(predicted.get("engagement_rate", 0.0), 0.0, 1.0)
    roi = max(0.0, predicted.get("roi", 0.0))

    # Confidence proxy: R^2 of the ROI target on the training holdout,
    # clipped to keep the contract with the pydantic response schema.
    roi_r2 = float(metrics.get("roi", {}).get("r2", 0.5))
    confidence = _clip(roi_r2, 0.10, 0.95)

    return {
        "predicted_roi": round(roi, 4),
        "predicted_engagement": round(engagement, 4),
        "confidence_score": round(confidence, 4),
    }


def model_available() -> bool:
    """True if the trained joblib bundle loaded successfully."""
    return _load_bundle() is not None
