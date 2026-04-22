"""FastAPI ML service for SmartMENA Analytics.

Endpoints:
    GET  /health              -- liveness probe
    POST /predict-sentiment   -- Arabic sentiment (see app/sentiment.py)
    POST /predict-roi         -- ROI placeholder / trained model (see app/roi_model.py)

Run locally:
    uvicorn app.main:app --reload --port 8000

This service is stateless and is intended to be called by the Express
backend over HTTP (see backend/src/services). It does not talk to the
database directly.
"""

import logging

from fastapi import FastAPI, HTTPException

from app import roi_model, sentiment
from app.schemas import (
    ROIRequest,
    ROIResponse,
    SentimentRequest,
    SentimentResponse,
)


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartmena-ml")


app = FastAPI(
    title="SmartMENA ML Service",
    version="0.1.0",
    description="Internal ML endpoints (sentiment + ROI) for the SmartMENA backend.",
)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "service": "smartmena-ml",
        "roi_model_loaded": roi_model.model_available(),
    }


@app.post("/predict-sentiment", response_model=SentimentResponse)
def predict_sentiment(req: SentimentRequest) -> SentimentResponse:
    """Classify Arabic text as positive / negative / neutral.

    Errors:
      * 400 -- request text is empty or contains no analysable content.
      * 503 -- the HF model is not installed or failed to load/run.
    """
    try:
        label, confidence = sentiment.analyze_sentiment(req.text)
    except ValueError as exc:
        # Empty / unusable input after cleaning.
        raise HTTPException(status_code=400, detail=str(exc))
    except sentiment.SentimentModelError as exc:
        # Model missing, cannot be downloaded, or inference crashed.
        logger.exception("Sentiment model unavailable")
        raise HTTPException(status_code=503, detail=str(exc))

    return SentimentResponse(sentiment=label, confidence=confidence)


@app.post("/predict-roi", response_model=ROIResponse)
def predict_roi(req: ROIRequest) -> ROIResponse:
    result = roi_model.predict_roi(req.model_dump())
    return ROIResponse(**result)
