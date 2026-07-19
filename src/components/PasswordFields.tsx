import { Field } from './ui';
import { passwordRules } from '../lib/password';

/**
 * A password + confirm-password pair with a live strength checklist. The parent
 * owns the values and decides when to submit (using `passwordOk` and a match check);
 * this just renders the inputs and the feedback.
 */
export function PasswordFields({
  password,
  setPassword,
  confirm,
  setConfirm,
  label = 'Password',
}: {
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  label?: string;
}) {
  const rules = passwordRules(password);
  const mismatch = confirm.length > 0 && confirm !== password;

  return (
    <>
      <Field label={label}>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
        />
      </Field>

      <ul className="pw-rules">
        {rules.map((r) => (
          <li key={r.label} className={r.met ? 'met' : ''}>
            <span aria-hidden="true">{r.met ? '✓' : '○'}</span> {r.label}
          </li>
        ))}
      </ul>

      <Field label="Confirm password">
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
        />
      </Field>
      {mismatch && <p className="auth-error">Passwords don't match.</p>}
    </>
  );
}
