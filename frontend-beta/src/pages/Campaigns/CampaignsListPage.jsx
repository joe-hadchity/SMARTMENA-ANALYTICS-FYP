import { Link, useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader.jsx";
import Button from "../../components/Button.jsx";
import Card from "../../components/Card.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import IdBadge from "../../components/IdBadge.jsx";
import { useStore } from "../../store/useStore.js";
import { fmtDate, fmtMoney, shortId } from "../../utils/format.js";
import styles from "./Campaigns.module.css";

export default function CampaignsListPage() {
  const { campaigns } = useStore();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Campaigns"
        subtitle={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"} in this session`}
        action={
          <Link to="/campaigns/new">
            <Button>New campaign</Button>
          </Link>
        }
      />

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="No campaigns yet"
            subtitle="Create your first campaign to begin analyzing posts and predicting ROI."
            action={
              <Link to="/campaigns/new">
                <Button>Create campaign</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <Card>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Platform</th>
                  <th>Region</th>
                  <th className={styles.numeric}>Budget</th>
                  <th>Created</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr
                    key={c.id}
                    className={styles.row}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    <td>
                      <span className={styles.name}>{c.campaign_name}</span>
                    </td>
                    <td>{c.platform}</td>
                    <td>{c.region || "-"}</td>
                    <td className={styles.numeric}>{fmtMoney(c.budget)}</td>
                    <td className={styles.muted}>{fmtDate(c.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <IdBadge value={c.id} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

// Prevent unused-import warning when shortId is referenced transitively
void shortId;
