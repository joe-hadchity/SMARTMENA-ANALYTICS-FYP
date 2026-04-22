import { Link } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Card, { CardHeader } from "../../components/Card.jsx";
import Button from "../../components/Button.jsx";
import StatTile from "../../components/StatTile.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import IdBadge from "../../components/IdBadge.jsx";
import RecentActivity from "../../components/RecentActivity.jsx";
import LatestResults from "../../components/LatestResults.jsx";
import { useStore } from "../../store/useStore.js";
import { fmtDate, fmtMoney, fmtNumber } from "../../utils/format.js";
import styles from "./Dashboard.module.css";

const QUICK_ACTIONS = [
  {
    to: "/campaigns/new",
    title: "Create campaign",
    hint: "Start a new ad campaign",
    tone: "campaign",
  },
  {
    to: "/campaigns",
    title: "Create post",
    hint: "Open a campaign to add posts",
    tone: "post",
  },
  {
    to: "/sentiment",
    title: "Analyze sentiment",
    hint: "Score a post as positive / negative / neutral",
    tone: "sentiment",
  },
  {
    to: "/roi",
    title: "Predict ROI",
    hint: "Estimate expected return for a campaign",
    tone: "prediction",
  },
];

export default function DashboardPage() {
  const { campaigns, posts, predictions, sentiments } = useStore();
  const lastCampaign = campaigns[0];
  const lastPost = posts[0];
  const lastSentiment = sentiments[0];
  const lastPrediction = predictions[0];

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Session summary. Data persists locally under smartmena.beta.v1."
        action={
          <Link to="/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        }
      />

      <div className={styles.tiles}>
        <StatTile
          label="Campaigns"
          value={campaigns.length}
          hint={`${posts.length} total post${posts.length === 1 ? "" : "s"}`}
        />
        <StatTile
          label="Analyzed posts"
          value={sentiments.length}
          hint={`across ${new Set(sentiments.map((s) => s.postId)).size} posts`}
        />
        <StatTile
          label="Last predicted ROI"
          tone="accent"
          value={
            lastPrediction ? `${fmtNumber(lastPrediction.predictedRoi, 2)}x` : "-"
          }
          hint={
            lastPrediction
              ? `${predictions.length} prediction${predictions.length === 1 ? "" : "s"} total`
              : "Run a prediction to see a value"
          }
        />
      </div>

      <Card>
        <CardHeader
          title="Latest results"
          subtitle="The most recent output of each workflow, ready to reuse by id"
        />
        <div className={styles.latestWrap}>
          <LatestResults
            campaign={lastCampaign}
            post={lastPost}
            sentiment={lastSentiment}
            prediction={lastPrediction}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Quick actions"
          subtitle="Jump straight to any of the four product workflows"
        />
        <div className={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <Link to={a.to} key={a.to} className={styles.action}>
              <div className={`${styles.actionDot} ${styles[`actionDot--${a.tone}`]}`} />
              <div className={styles.actionBody}>
                <div className={styles.actionTitle}>{a.title}</div>
                <div className={styles.actionHint}>{a.hint}</div>
              </div>
              <div className={styles.actionArrow} aria-hidden="true">
                →
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Recent activity"
          subtitle="Most recent actions across campaigns, posts, sentiment, and ROI"
        />
        <RecentActivity
          campaigns={campaigns}
          posts={posts}
          sentiments={sentiments}
          predictions={predictions}
          limit={8}
        />
      </Card>

      <Card>
        <CardHeader
          title="Recent campaigns"
          subtitle="Most recently created in this session"
          action={
            campaigns.length > 0 ? (
              <Link to="/campaigns">
                <Button variant="ghost" size="sm">
                  View all
                </Button>
              </Link>
            ) : null
          }
        />
        {campaigns.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            subtitle="Create your first campaign to start collecting posts, sentiment, and ROI predictions."
            action={
              <Link to="/campaigns/new">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        ) : (
          <ul className={styles.list}>
            {campaigns.slice(0, 5).map((c) => (
              <li key={c.id} className={styles.listItem}>
                <Link to={`/campaigns/${c.id}`} className={styles.listLink}>
                  <div className={styles.listText}>
                    <div className={styles.listTitle}>{c.campaign_name}</div>
                    <div className={styles.listMeta}>
                      <span>{c.platform}</span>
                      <span className={styles.sep}>·</span>
                      <span>{c.region || "-"}</span>
                      <span className={styles.sep}>·</span>
                      <span>{fmtMoney(c.budget)}</span>
                      <span className={styles.sep}>·</span>
                      <span>{fmtDate(c.created_at)}</span>
                    </div>
                  </div>
                  <div className={styles.listRight}>
                    <IdBadge value={c.id} size="sm" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

    </>
  );
}
