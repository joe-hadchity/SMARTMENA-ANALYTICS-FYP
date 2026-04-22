import styles from "./EmptyState.module.css";

export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.mark} aria-hidden="true" />
      <div className={styles.title}>{title}</div>
      {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}
