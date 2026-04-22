"""Pydantic request/response models shared by the FastAPI endpoints."""

from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Sentiment
# ---------------------------------------------------------------------------
class SentimentRequest(BaseModel):
    """Input for POST /predict-sentiment.

    Only ``text`` is required. The service assumes Arabic (MSA + dialects);
    a language hint is intentionally omitted for the MVP.
    """

    text: str = Field(..., min_length=1, max_length=5000)


class SentimentResponse(BaseModel):
    """Output of POST /predict-sentiment."""

    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float = Field(..., ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# ROI
# ---------------------------------------------------------------------------
class ROIRequest(BaseModel):
    """Input for POST /predict-roi.

    Field set mirrors the columns of the synthetic training CSV
    (``ml-service/data/synthetic_campaigns.csv``) so there is no
    train/serve skew.
    """

    budget: float = Field(..., gt=0, description="Campaign budget in USD.")
    platform: Literal["instagram", "facebook", "tiktok", "twitter"]
    content_type: Literal["image", "video", "carousel", "reel", "story"]
    audience_size: int = Field(..., gt=0)
    posting_hour: int = Field(..., ge=0, le=23, description="Hour of day, 0-23.")
    sentiment_score: float = Field(
        ..., ge=-1.0, le=1.0, description="Post sentiment, -1 (neg) .. 1 (pos)."
    )
    holiday_flag: int = Field(..., ge=0, le=1, description="1 if campaign runs during a MENA holiday.")
    region: Literal["Lebanon", "UAE", "Saudi Arabia", "Egypt", "Jordan"]


class ROIResponse(BaseModel):
    """Output of POST /predict-roi."""

    predicted_roi: float = Field(..., description="Predicted revenue / spend ratio.")
    predicted_engagement: float = Field(
        ..., ge=0.0, le=1.0, description="Predicted engagement rate in [0, 1]."
    )
    confidence_score: float = Field(..., ge=0.0, le=1.0)
