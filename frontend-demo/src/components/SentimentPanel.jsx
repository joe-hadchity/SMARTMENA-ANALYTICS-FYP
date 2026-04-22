import { useState } from "react";
import { analyzeSentiment } from "../services/api.js";
import ResultBlock from "./ResultBlock.jsx";

export default function SentimentPanel({ post, sentiment, onAnalyzed, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleClick() {
    if (!post) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeSentiment({
        postId: post.id,
        text: post.text_content,
      });
      onAnalyzed(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  const summary = sentiment ? buildSummary(sentiment) : null;

  return (
    <>
      <div className="form">
        <div className="hint">
          postId: <code>{post ? post.id : "(create a post first)"}</code>
        </div>
        {post ? (
          <div className="preview">
            <span className="preview__label">Text:</span>
            <span className="preview__text">{post.text_content}</span>
          </div>
        ) : null}

        <button
          className="btn"
          type="button"
          onClick={handleClick}
          disabled={disabled || loading}
        >
          {loading ? "Analyzing..." : "Analyze sentiment"}
        </button>
      </div>

      <ResultBlock
        title="Sentiment result"
        data={sentiment}
        error={error}
        summary={summary}
      />
    </>
  );
}

function buildSummary(sentiment) {
  if (!sentiment) return null;
  const label = sentiment.sentiment;
  const confidence = sentiment.confidence;
  if (!label) return null;
  const pct =
    typeof confidence === "number" ? ` (${(confidence * 100).toFixed(1)}%)` : "";
  return `${label}${pct}`;
}
