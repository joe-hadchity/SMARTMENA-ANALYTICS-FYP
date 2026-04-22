import { useMemo } from "react";
import { Link } from "react-router-dom";
import IdBadge from "./IdBadge.jsx";
import StatusPill from "./StatusPill.jsx";
import EmptyState from "./EmptyState.jsx";
import { fmtDate, fmtNumber } from "../utils/format.js";
import styles from "./RecentActivity.module.css";

export default function RecentActivity({
  campaigns = [],
  posts = [],
  sentiments = [],
  predictions = [],
  limit = 8,
}) {
  const entries = useMemo(() => {
    const items = [
      ...campaigns.map((c) => ({
        key: `c:${c.id}`,
        kind: "campaign",
        at: tsOf(c.created_at),
        campaign: c,
      })),
      ...posts.map((p) => ({
        key: `p:${p.id}`,
        kind: "post",
        at: tsOf(p.created_at),
        post: p,
      })),
      ...sentiments.map((s, i) => ({
        key: `s:${s.postId}:${s._at || i}`,
        kind: "sentiment",
        at: s._at || 0,
        sentiment: s,
      })),
      ...predictions.map((r, i) => ({
        key: `r:${r.campaignId}:${r._at || i}`,
        kind: "prediction",
        at: r._at || 0,
        prediction: r,
      })),
    ];
    items.sort((a, b) => b.at - a.at);
    return items.slice(0, limit);
  }, [campaigns, posts, sentiments, predictions, limit]);

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        subtitle="Create a campaign, add a post, or run an analysis to see recent actions here."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {entries.map((e) => (
        <li key={e.key} className={styles.item}>
          <div className={`${styles.dot} ${styles[`dot--${e.kind}`]}`} />
          <div className={styles.body}>{renderEntry(e)}</div>
          <div className={styles.time}>{fmtDate(e.at)}</div>
        </li>
      ))}
    </ul>
  );
}

function renderEntry(e) {
  if (e.kind === "campaign") {
    return (
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Created campaign</span>{" "}
          <Link to={`/campaigns/${e.campaign.id}`} className={styles.link}>
            {e.campaign.campaign_name}
          </Link>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.meta}>
            {e.campaign.platform} · {e.campaign.region || "-"}
          </span>
          <IdBadge label="campaignId" value={e.campaign.id} size="sm" />
        </div>
      </div>
    );
  }
  if (e.kind === "post") {
    return (
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Created post</span>{" "}
          <span className={styles.text}>{truncate(e.post.text_content, 80)}</span>
        </div>
        <div className={styles.metaRow}>
          <IdBadge label="postId" value={e.post.id} size="sm" />
          <IdBadge label="campaignId" value={e.post.campaign_id} size="sm" />
        </div>
      </div>
    );
  }
  if (e.kind === "sentiment") {
    return (
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Sentiment analyzed</span>{" "}
          <StatusPill tone={toneFor(e.sentiment.sentiment)}>
            {e.sentiment.sentiment} (
            {(Number(e.sentiment.confidence) * 100).toFixed(0)}%)
          </StatusPill>
        </div>
        <div className={styles.metaRow}>
          <IdBadge label="postId" value={e.sentiment.postId} size="sm" />
        </div>
      </div>
    );
  }
  if (e.kind === "prediction") {
    return (
      <div className={styles.row}>
        <div>
          <span className={styles.label}>Predicted ROI</span>{" "}
          <strong className={styles.roi}>
            {fmtNumber(e.prediction.predictedRoi, 2)}x
          </strong>
          <span className={styles.roiMeta}>
            engagement{" "}
            {(Number(e.prediction.predictedEngagement) * 100).toFixed(2)}%
          </span>
        </div>
        <div className={styles.metaRow}>
          <IdBadge label="campaignId" value={e.prediction.campaignId} size="sm" />
        </div>
      </div>
    );
  }
  return null;
}

function toneFor(label) {
  if (label === "positive") return "positive";
  if (label === "negative") return "negative";
  return "neutral";
}

function truncate(s, n) {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n - 1)}...` : s;
}

function tsOf(dateStr) {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return Number.isNaN(t) ? 0 : t;
}
