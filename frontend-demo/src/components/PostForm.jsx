import { useState } from "react";
import { createPost } from "../services/api.js";
import ResultBlock from "./ResultBlock.jsx";

const SAMPLES = [
  { key: "positive", label: "Positive (ar)", text: "المنتج ممتاز وسعره مناسب" },
  { key: "negative", label: "Negative (ar)", text: "الخدمة سيئة جدا ولم أحصل على ردود" },
  { key: "neutral", label: "Neutral (ar)", text: "تم استلام الطلب اليوم" },
];

export default function PostForm({ campaign, post, onCreated, disabled }) {
  const [text, setText] = useState(SAMPLES[0].text);
  const [language, setLanguage] = useState("ar");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!campaign) return;
    setLoading(true);
    setError(null);
    try {
      const created = await createPost({
        campaign_id: campaign.id,
        text_content: text,
        language,
      });
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
        <div className="hint">
          campaign_id:{" "}
          <code>{campaign ? campaign.id : "(create a campaign first)"}</code>
        </div>

        <div className="sample-row">
          <span className="sample-row__label">Samples:</span>
          {SAMPLES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`chip ${text === s.text ? "chip--active" : ""}`}
              onClick={() => setText(s.text)}
              disabled={disabled}
            >
              {s.label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Post text</span>
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            required
          />
        </label>

        <label className="field field--inline">
          <span>Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={disabled}
          >
            <option value="ar">ar</option>
            <option value="en">en</option>
          </select>
        </label>

        <button className="btn" type="submit" disabled={disabled || loading}>
          {loading ? "Creating..." : "Create post"}
        </button>
      </form>

      <ResultBlock
        title="Post created"
        data={post}
        error={error}
        summary={post ? `id: ${post.id}` : null}
      />
    </>
  );
}
