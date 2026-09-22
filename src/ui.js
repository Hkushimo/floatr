import Link from "next/link";

export function Page({ title, subtitle, children, logoOnly = false }) {
  return (
    <>
      <title>{title ? `${title} · Floatr` : "Floatr"}</title>
      <main className="page">
        <section className="shell">
          {(title || subtitle) && (
            <header className={`page-header ${logoOnly ? "logo-only-header" : ""}`}>
              <Logo className={logoOnly ? "landing-logo" : ""} />
              {!logoOnly && title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </header>
          )}
          {children}
        </section>
      </main>
    </>
  );
}

export function Logo({ className = "" }) {
  return (
    <div className={`wordmark ${className}`} aria-label="Floatr">
      <span className="logo-main">float</span>
      <span className="logo-tail">r</span>
      <span className="logo-dot" aria-hidden="true" />
    </div>
  );
}

export function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

export function Button({ children, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {children}
    </button>
  );
}

export function PrimaryLink({ href, children }) {
  return (
    <Link className="button" href={href}>
      {children}
    </Link>
  );
}

export function Muted({ children }) {
  return <p className="muted">{children}</p>;
}

export function TextInput(props) {
  return <input className="input" {...props} />;
}

export function TextArea(props) {
  return <textarea className="input textarea" {...props} />;
}

export function Select(props) {
  return <select className="input" {...props} />;
}

export function StatusPill({ children, tone = "neutral" }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}
