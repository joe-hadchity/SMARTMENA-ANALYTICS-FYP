import styles from "./Card.module.css";

export default function Card({ children, className = "", tone = "default" }) {
  return (
    <section className={`${styles.card} ${styles[`card--${tone}`]} ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerText}>
        <h3 className={styles.title}>{title}</h3>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </header>
  );
}

export function CardBody({ children, padded = true }) {
  return (
    <div className={`${styles.body} ${padded ? styles["body--padded"] : ""}`}>
      {children}
    </div>
  );
}
