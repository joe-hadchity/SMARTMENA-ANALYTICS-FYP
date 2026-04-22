import styles from "./StatTile.module.css";

export default function StatTile({ label, value, hint, tone = "default" }) {
  return (
    <div className={`${styles.tile} ${styles[`tile--${tone}`]}`}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{value}</div>
      {hint ? <div className={styles.hint}>{hint}</div> : null}
    </div>
  );
}
