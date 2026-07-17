import { useEffect, useState, type ReactNode } from 'react';

export function Card({
  title,
  action,
  children,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** A label/value line. `tone` tints the value; `strong` is for totals. */
export function Row({
  label,
  value,
  sub,
  tone,
  strong,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'positive' | 'negative' | 'muted';
  strong?: boolean;
}) {
  return (
    <div className={`row${strong ? ' row-strong' : ''}`}>
      <div className="row-label">
        <span>{label}</span>
        {sub && <small>{sub}</small>}
      </div>
      <span className={`row-value${tone ? ` ${tone}` : ''}`}>{value}</span>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <strong className={`stat-value${tone ? ` ${tone}` : ''}`}>{value}</strong>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <small className="field-hint">{hint}</small>}
    </label>
  );
}

/**
 * A numeric input backed by a string buffer, so the field can be emptied and
 * mid-typing values like "1." don't get clobbered by a re-render.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  allowEmpty = false,
  onClear,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  /** When true, clearing the field calls `onClear` instead of committing 0. */
  allowEmpty?: boolean;
  onClear?: () => void;
}) {
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [focused, setFocused] = useState(false);

  // Re-sync when the value changes underneath us (import, reset), but never while typing.
  useEffect(() => {
    if (!focused) setDraft(value === undefined ? '' : String(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (allowEmpty) onClear?.();
      else onChange(0);
      return;
    }
    const parsed = Number(trimmed.replace(/[^0-9.-]/g, ''));
    onChange(Number.isFinite(parsed) ? parsed : 0);
  };

  return (
    <div className="input-wrap">
      {prefix && <span className="affix">{prefix}</span>}
      <input
        className="input"
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={draft}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          commit(e.target.value);
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
      />
      {suffix && <span className="affix affix-end">{suffix}</span>}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  list,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** id of a <datalist> to suggest previously-used values. */
  list?: string;
}) {
  return (
    <input
      className="input"
      type="text"
      list={list}
      value={value}
      placeholder={placeholder}
      enterKeyHint="done"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  type?: 'button' | 'submit';
}) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

/** Small round ✕ used to delete a list item. */
export function DeleteButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="delete" onClick={onClick} aria-label={label} type="button">
      ✕
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

/** Renders unique previously-used values as autocomplete suggestions. */
export function Suggestions({ id, values }: { id: string; values: string[] }) {
  const unique = [...new Set(values.map((v) => v.trim()).filter(Boolean))].sort();
  return (
    <datalist id={id}>
      {unique.map((v) => (
        <option key={v} value={v} />
      ))}
    </datalist>
  );
}
