import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

const ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/campaigns", label: "Campaigns" },
  { to: "/sentiment", label: "Sentiment" },
  { to: "/roi", label: "ROI" },
];

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brand__mark}>SM</div>
        <div>
          <div className={styles.brand__name}>SmartMENA</div>
          <div className={styles.brand__tag}>Analytics - beta</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `${styles.navItem} ${isActive ? styles["navItem--active"] : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.footer__line}>
          <span>API</span>
          <code>{import.meta.env.VITE_API_BASE_URL || "(unset)"}</code>
        </div>
        <div className={styles.footer__line}>
          <span>User</span>
          <code>
            {import.meta.env.VITE_DEMO_USER_ID
              ? shortUuid(import.meta.env.VITE_DEMO_USER_ID)
              : "(unset)"}
          </code>
        </div>
      </div>
    </aside>
  );
}

function shortUuid(id) {
  if (!id || id.length < 12) return id || "";
  return `${id.slice(0, 8)}...${id.slice(-4)}`;
}
