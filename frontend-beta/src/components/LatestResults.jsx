import { Link } from "react-router-dom";
import IdBadge from "./IdBadge.jsx";
import StatusPill from "./StatusPill.jsx";
import { fmtDate, fmtMoney, fmtNumber } from "../utils/format.js";
import styles from "./LatestResults.module.css";

export default function LatestResults({
  campaign,
  post,
  sentiment,
  prediction,
}) {
  return (
    <div className={styles.grid}>
      <Tile
        tone="campaign"
        label="Latest campaign"
        emptyHint="No campaign created yet"
        emptyAction={<Link to="/campaigns/new">Create campaign</Link>}
        timestamp={campaign?.created_at}
        idLabel="campaignId"
        idValue={campaign?.id}
      >
        {campaign ? (
          <>
            <div className={styles.title} title={campaign.campaign_name}>
              {campaign.campaign_name}
            </div>
            <div className={styles.meta}>
              <span>{campaign.platform}</span>
              <span className={styles.sep}>·</span>
              <span>{campaign.region || "-"}</span>
              <span className={styles.sep}>·</span>
              <span>{fmtMoney(campaign.budget)}</span>
            </div>
          </>
        ) : null}
      </Tile>

      <Tile
        tone="post"
        label="Latest post"
        emptyHint="No posts created yet"
        emptyAction={
          <Link to="/campaigns">Open a campaign</Link>
        }
        timestamp={post?.created_at}
        idLabel="postId"
        idValue={post?.id}
      >
        {post ? (
          <>
            <div className={styles.postText}>
              {truncate(post.text_content, 110)}
            </div>
            <div className={styles.meta}>
              <IdBadge label="campaignId" value={post.campaign_id} size="sm" />
            </div>
          </>
        ) : null}
      </Tile>

      <Tile
        tone="sentiment"
        label="Latest sentiment"
        emptyHint="No sentiment result yet"
        emptyAction={<Link to="/sentiment">Analyze a post</Link>}
        timestamp={sentiment?._at}
        idLabel="postId"
        idValue={sentiment?.postId}
      >
        {sentiment ? (
          <>
            <div className={styles.sentimentRow}>
              <StatusPill tone={toneFor(sentiment.sentiment)}>
                {sentiment.sentiment}
              </StatusPill>
              <span className={styles.sentimentConfidence}>
                {(Number(sentiment.confidence) * 100).toFixed(0)}% confidence
              </span>
            </div>
          </>
        ) : null}
      </Tile>

      <Tile
        tone="prediction"
        label="Latest ROI prediction"
        emptyHint="No ROI prediction yet"
        emptyAction={<Link to="/roi">Predict ROI</Link>}
        timestamp={prediction?._at}
        idLabel="campaignId"
        idValue={prediction?.campaignId}
      >
        {prediction ? (
          <>
            <div className={styles.roi}>
              {fmtNumber(prediction.predictedRoi, 2)}
              <span className={styles.roiX}>x</span>
            </div>
            <div className={styles.meta}>
              engagement{" "}
              {(Number(prediction.predictedEngagement) * 100).toFixed(2)}%
              <span className={styles.sep}>·</span>
              conf {(Number(prediction.confidenceScore) * 100).toFixed(0)}%
            </div>
          </>
        ) : null}
      </Tile>
    </div>
  );
}

function Tile({
  tone,
  label,
  emptyHint,
  emptyAction,
  timestamp,
  idLabel,
  idValue,
  children,
}) {
  const hasValue = Boolean(children);
  return (
    <div className={`${styles.tile} ${hasValue ? styles[`tile--${tone}`] : styles["tile--empty"]}`}>
      <div className={styles.header}>
        <span className={`${styles.dot} ${styles[`dot--${tone}`]}`} />
        <span className={styles.label}>{label}</span>
        {hasValue && timestamp ? (
          <span className={styles.time}>{fmtDate(timestamp)}</span>
        ) : null}
      </div>
      <div className={styles.body}>
        {hasValue ? (
          children
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyHint}>{emptyHint}</div>
            {emptyAction ? (
              <div className={styles.emptyAction}>{emptyAction}</div>
            ) : null}
          </div>
        )}
      </div>
      {hasValue && idValue ? (
        <div className={styles.footer}>
          <IdBadge label={idLabel} value={idValue} size="sm" />
        </div>
      ) : null}
    </div>
  );
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
