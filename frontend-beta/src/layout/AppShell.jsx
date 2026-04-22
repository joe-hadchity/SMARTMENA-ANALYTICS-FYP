import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import HealthBanner from "./HealthBanner.jsx";
import styles from "./AppShell.module.css";

export default function AppShell() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <HealthBanner />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
