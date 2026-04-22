import styles from "./PageHeader.module.css";

export default function PageHeader({ title, subtitle, action }) {
  return (
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}
