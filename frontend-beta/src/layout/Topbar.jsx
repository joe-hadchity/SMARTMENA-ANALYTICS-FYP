import { useLocation } from "react-router-dom";
import styles from "./Topbar.module.css";

const TITLES = {
  "/": "Dashboard",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New campaign",
  "/sentiment": "Sentiment analysis",
  "/roi": "ROI prediction",
  "/404": "Not found",
};

export default function Topbar() {
  const { pathname } = useLocation();
  const title =
    TITLES[pathname] ||
    (pathname.startsWith("/campaigns/") ? "Campaign detail" : "SmartMENA");

  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.meta}>
        <span className={styles.metaDot} /> Live
      </div>
    </header>
  );
}
