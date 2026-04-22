import { useState } from "react";
import { createCampaign } from "../services/api.js";
import ResultBlock from "./ResultBlock.jsx";

const PLATFORMS = ["facebook", "instagram", "tiktok", "google", "x"];
const REGIONS = ["LB", "AE", "SA", "EG", "JO"];
const CONTENT_TYPES = ["image", "video", "carousel", "reel", "story"];

const initialForm = {
  campaign_name: "Ramadan launch",
  platform: "instagram",
  budget: 2500,
  audience_size: 80000,
  content_type: "image",
  region: "AE",
};

export default function CampaignForm({ onCreated, campaign }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function update(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        campaign_name: form.campaign_name,
        platform: form.platform,
        budget: Number(form.budget),
        audience_size: Number(form.audience_size),
        content_type: form.content_type,
        region: form.region,
      };
      const created = await createCampaign(payload);
      onCreated(created);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Campaign name</span>
          <input
            type="text"
            value={form.campaign_name}
            onChange={(e) => update("campaign_name", e.target.value)}
            required
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Platform</span>
            <select
              value={form.platform}
              onChange={(e) => update("platform", e.target.value)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Region</span>
            <select
              value={form.region}
              onChange={(e) => update("region", e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Budget (USD)</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.budget}
              onChange={(e) => update("budget", e.target.value)}
              required
            />
          </label>

          <label className="field">
            <span>Audience size</span>
            <input
              type="number"
              min="0"
              step="1"
              value={form.audience_size}
              onChange={(e) => update("audience_size", e.target.value)}
            />
          </label>

          <label className="field">
            <span>Content type</span>
            <select
              value={form.content_type}
              onChange={(e) => update("content_type", e.target.value)}
            >
              {CONTENT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Create campaign"}
        </button>
      </form>

      <ResultBlock
        title="Campaign created"
        data={campaign}
        error={error}
        summary={campaign ? `id: ${campaign.id}` : null}
      />
    </>
  );
}
