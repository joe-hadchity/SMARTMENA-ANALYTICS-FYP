"""Generate a synthetic ROI dataset for SmartMENA Analytics.

Output: ``ml-service/data/synthetic_campaigns.csv``

This is a *prototype* dataset. It is explicitly not real campaign data --
it is a deterministically generated sample meant for:

    * training and sanity-checking the ROI regression model,
    * smoke-testing the end-to-end pipeline (backend -> ml-service -> DB),
    * demos where real SME data is not yet available.

Design notes
------------
We sample each feature from a defensible marginal distribution, then compute
``engagement_rate`` and ``roi`` as a **known function** of the features with
noise added on top. This gives the ML model something real to learn and
lets us explain every correlation in the report.

Relationships baked in (all with Gaussian multiplicative noise):

* **Platform** -- engagement baseline: tiktok > instagram > facebook > twitter.
* **Content type** -- reel/video engage more than image/story.
* **Posting hour** -- peak around 18-21 local time, trough around 03-06.
* **Sentiment score** -- higher sentiment -> higher engagement and ROI.
* **Holiday flag** -- Ramadan/Eid/national holiday lift (~+20%).
* **Audience size** -- larger audiences dilute engagement *rate*.
* **Region** -- purchasing-power proxy: UAE/SA > Jordan/Lebanon > Egypt.
* **Budget** -- diminishing marginal returns on ROI (not engagement rate).

Usage
-----
    python ml-service/scripts/generate_dataset.py
    python ml-service/scripts/generate_dataset.py --rows 1000 --seed 7

The seed is fixed by default so the file is reproducible across machines.
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Categorical domains
# ---------------------------------------------------------------------------
PLATFORMS = ["instagram", "facebook", "tiktok", "twitter"]
PLATFORM_WEIGHTS = [0.38, 0.30, 0.22, 0.10]  # reflects MENA SME platform mix

REGIONS = ["Lebanon", "UAE", "Saudi Arabia", "Egypt", "Jordan"]
REGION_WEIGHTS = [0.18, 0.25, 0.25, 0.22, 0.10]

CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"]
CONTENT_WEIGHTS = [0.30, 0.22, 0.18, 0.20, 0.10]

# Platform-specific engagement baselines (rate of reach -> interaction).
# Source: rough industry medians for MENA social, 2023-2024.
PLATFORM_ENGAGEMENT = {
    "instagram": 0.045,
    "facebook": 0.020,
    "tiktok": 0.075,
    "twitter": 0.015,
}

# Multiplicative effect of content type on engagement.
CONTENT_MULTIPLIER = {
    "image": 1.00,
    "video": 1.35,
    "carousel": 1.15,
    "reel": 1.45,
    "story": 0.85,
}

# Purchasing-power proxy, used to scale ROI (not engagement).
REGION_POWER = {
    "Lebanon": 0.85,
    "UAE": 1.25,
    "Saudi Arabia": 1.20,
    "Egypt": 0.75,
    "Jordan": 0.90,
}


# ---------------------------------------------------------------------------
# Generator
# ---------------------------------------------------------------------------
def generate(n_rows: int = 800, seed: int = 42) -> pd.DataFrame:
    """Return a DataFrame with ``n_rows`` synthetic campaign records."""
    rng = np.random.default_rng(seed)

    # ---- raw features -----------------------------------------------------
    platform = rng.choice(PLATFORMS, size=n_rows, p=PLATFORM_WEIGHTS)
    region = rng.choice(REGIONS, size=n_rows, p=REGION_WEIGHTS)
    content_type = rng.choice(CONTENT_TYPES, size=n_rows, p=CONTENT_WEIGHTS)

    # Budget in USD. Log-normal so most SMEs sit around a few hundred dollars
    # but a long tail reaches a few thousand.
    budget = np.round(
        np.clip(np.exp(rng.normal(loc=6.0, scale=0.9, size=n_rows)), 50, 10_000),
        2,
    )

    # Audience size (integer). Also log-normal: most pages have 1k-100k
    # followers, a few reach 500k.
    audience_size = np.clip(
        np.exp(rng.normal(loc=9.0, scale=1.1, size=n_rows)),
        500,
        500_000,
    ).astype(int)

    # Posting hour 0-23, biased to late afternoon/evening.
    posting_hour = np.clip(
        np.round(rng.normal(loc=18, scale=4, size=n_rows)), 0, 23
    ).astype(int)

    # Sentiment score in [-1, 1]; advertising copy skews positive.
    sentiment_score = np.round(
        np.clip(rng.normal(loc=0.30, scale=0.35, size=n_rows), -1.0, 1.0), 3
    )

    # Holiday flag: ~20% of campaigns run during Ramadan / Eid / Nat'l Day.
    holiday_flag = rng.choice([0, 1], size=n_rows, p=[0.80, 0.20])

    # ---- derived signals --------------------------------------------------
    # Hour factor: quadratic peak at 19:00, trough far from peak.
    hour_factor = np.clip(1.0 - 0.25 * ((posting_hour - 19) / 12) ** 2, 0.60, 1.15)

    # Large audiences dilute the engagement rate (but increase raw reach).
    audience_factor = np.clip(
        1.0 - 0.08 * np.log10(audience_size / 5_000), 0.55, 1.20
    )

    sentiment_factor = 1.0 + 0.40 * sentiment_score  # [-1,1] -> [0.6, 1.4]
    holiday_factor = 1.0 + 0.20 * holiday_flag

    # Engagement rate = platform baseline * content mult * contextual factors
    base_eng = np.array([PLATFORM_ENGAGEMENT[p] for p in platform])
    cmult = np.array([CONTENT_MULTIPLIER[c] for c in content_type])
    eng_noise = rng.normal(1.0, 0.18, size=n_rows)

    engagement_rate = np.clip(
        base_eng
        * cmult
        * hour_factor
        * audience_factor
        * sentiment_factor
        * holiday_factor
        * eng_noise,
        0.002,
        0.35,
    )
    engagement_rate = np.round(engagement_rate, 4)

    # ROI = revenue / spend.
    # Driven by engagement, sentiment, holiday, regional buying power, and
    # diminishing returns on budget.
    region_factor = np.array([REGION_POWER[r] for r in region])
    budget_factor = np.clip(
        1.0 / (1.0 + 0.15 * np.log10(np.maximum(budget, 50) / 500)), 0.50, 1.30
    )
    roi_noise = rng.normal(1.0, 0.25, size=n_rows)

    roi = (
        1.8  # break-even = 1.0; sample is centred around a healthy 1.8x
        * (engagement_rate / 0.04)
        * sentiment_factor
        * holiday_factor
        * region_factor
        * budget_factor
        * roi_noise
    )
    roi = np.round(np.clip(roi, 0.10, 15.0), 3)

    return pd.DataFrame(
        {
            "budget": budget,
            "platform": platform,
            "content_type": content_type,
            "audience_size": audience_size,
            "posting_hour": posting_hour,
            "sentiment_score": sentiment_score,
            "holiday_flag": holiday_flag,
            "region": region,
            "engagement_rate": engagement_rate,
            "roi": roi,
        }
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Synthetic ROI dataset generator.")
    parser.add_argument("--rows", type=int, default=800, help="Number of rows (500-1000 recommended).")
    parser.add_argument("--seed", type=int, default=42, help="RNG seed for reproducibility.")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "data" / "synthetic_campaigns.csv",
        help="Output CSV path.",
    )
    args = parser.parse_args()

    if not (500 <= args.rows <= 1000):
        print(f"[warn] --rows={args.rows} is outside the recommended 500-1000 range.")

    df = generate(n_rows=args.rows, seed=args.seed)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(args.out, index=False)

    print(f"Wrote {len(df)} rows to {args.out}")
    print("Head:")
    print(df.head(5).to_string(index=False))
    print("\nSummary:")
    print(df.describe(include="all").to_string())


if __name__ == "__main__":
    main()
