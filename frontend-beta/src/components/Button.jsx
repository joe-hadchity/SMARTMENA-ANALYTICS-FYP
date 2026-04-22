import styles from "./Button.module.css";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  type = "button",
  onClick,
  className = "",
  ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${styles.btn} ${styles[`btn--${variant}`]} ${styles[`btn--${size}`]} ${className}`}
      {...rest}
    >
      {loading ? (
        <>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Working...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
