import styles from "./StatusPill.module.css";

export default function StatusPill({ tone = "neutral", children }) {
  return <span className={`${styles.pill} ${styles[`pill--${tone}`]}`}>{children}</span>;
}
