export default function Section({ step, title, enabled = true, done = false, children }) {
  const status = done ? "done" : enabled ? "active" : "locked";
  const label = done ? "Done" : enabled ? "Ready" : "Locked";
  return (
    <section className={`section section--${status}`}>
      <header className="section__header">
        <span className={`section__step section__step--${status}`}>
          {done ? <span className="section__check" aria-hidden="true" /> : step}
        </span>
        <h2 className="section__title">{title}</h2>
        <span className={`section__status section__status--${status}`}>{label}</span>
      </header>
      <div className="section__body">{children}</div>
    </section>
  );
}
