import { useMemo, useState } from "react";
import { predictRoi } from "../services/api.js";
import ResultBlock from "./ResultBlock.jsx";

const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];

// Map campaign validator values -> ROI validator values.
const PLATFORM_MAP = {
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  x: "twitter",
  google: "facebook", // google isn't accepted by ROI; fall back
};

const REGION_MAP = {
  LB: "Lebanon",
  AE: "UAE",
  SA: "Saudi Arabia",
  EG: "Egypt",
  JO: "Jordan",
};

export default function RoiForm({ campaign, sentiment, roi, onPredicted, disabled }) {
  const derivedSentimentScore = useMemo(
    () => sentimentScoreFromResult(sentiment),
    [sentiment],
  );

  const [contentType, setContentType] = useState("image");
  const [postingHour, setPostingHour] = useState(19);
  const [holidayFlag, setHolidayFlag] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!campaign || !sentiment) return;
    setLoading(true);
    setError(null);
    try {
      const payload = {
        campaignId: campaign.id,
        budget: Number(campaign.budget),
        platform: PLATFORM_MAP[campaign.platform] || "instagram",
        contentType,
        audienceSize: Number(campaign.audience_size ?? 10000),
        postingHour: Number(postingHour),
        sentimentScore: Number(derivedSentimentScore ?? 0),
        holidayFlag: Number(holidayFlag),
        region: REGION_MAP[campaign.region] || "UAE",
      };
      const result = await predictRoi(payload);
      onPredicted(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const summary = roi ? buildSummary(roi) : null;

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        <div className="prefill">
          <div>
            <span>campaignId</span>
            <code>{campaign ? campaign.id : "-"}</code>
          </div>
          <div>
            <span>budget</span>
            <code>{campaign ? campaign.budget : "-"}</code>
          </div>
          <div>
            <span>platform</span>
            <code>
              {campaign ? PLATFORM_MAP[campaign.platform] || "instagram" : "-"}
            </code>
          </div>
          <div>
            <span>audienceSize</span>
            <code>{campaign ? campaign.audience_size ?? 10000 : "-"}</code>
          </div>
          <div>
            <span>region</span>
            <code>{campaign ? REGION_MAP[campaign.region] || "UAE" : "-"}</code>
          </div>
          <div>
            <span>sentimentScore</span>
            <code>
              {derivedSentimentScore != null
                ? derivedSentimentScore.toFixed(3)
                : "-"}
            </code>
          </div>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Content type</span>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              disabled={disabled}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Posting hour (0-23)</span>
            <input
              type="number"
              min="0"
              max="23"
              value={postingHour}
              onChange={(e) => setPostingHour(e.target.value)}
              disabled={disabled}
              required
            />
          </label>

          <label className="field">
            <span>Holiday</span>
            <select
              value={holidayFlag}
              onChange={(e) => setHolidayFlag(Number(e.target.value))}
              disabled={disabled}
            >
              <option value={0}>No</option>
              <option value={1}>Yes</option>
            </select>
          </label>
        </div>

        <button className="btn" type="submit" disabled={disabled || loading}>
          {loading ? "Predicting..." : "Predict ROI"}
        </button>
      </form>

      <ResultBlock
        title="ROI prediction"
        data={roi}
        error={error}
        summary={summary}
      />
    </>
  );
}

function sentimentScoreFromResult(sentiment) {
  if (!sentiment) return null;
  const label = sentiment.sentiment;
  const confidence =
    typeof sentiment.confidence === "number" ? sentiment.confidence : 0;
  if (label === "positive") return clamp(confidence, -1, 1);
  if (label === "negative") return clamp(-confidence, -1, 1);
  if (label === "neutral") return 0;
  return null;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function buildSummary(roi) {
  const parts = [];
  if (roi.predictedRoi != null)
    parts.push(`ROI ${Number(roi.predictedRoi).toFixed(2)}x`);
  if (roi.predictedEngagement != null)
    parts.push(`engagement ${(Number(roi.predictedEngagement) * 100).toFixed(2)}%`);
  if (roi.confidenceScore != null)
    parts.push(`confidence ${(Number(roi.confidenceScore) * 100).toFixed(1)}%`);
  return parts.join(" | ") || null;
}
