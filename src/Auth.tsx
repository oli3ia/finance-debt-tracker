import { useState } from 'react';
import { useStore } from './store';
import { Card, Field, Button } from './components/ui';
import { PasswordFields } from './components/PasswordFields';
import { passwordOk } from './lib/password';

type Mode = 'in' | 'up' | 'forgot';

/** The sign-in / sign-up / forgot-password gate, shown when nobody's signed in. */
export function Auth() {
  const { signIn, signUp, sendPasswordReset } = useStore();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const switchTo = (next: Mode) => {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirm('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (mode === 'forgot') {
      if (!email.trim()) {
        setError('Enter the email address for your account.');
        return;
      }
      setBusy(true);
      const { error } = await sendPasswordReset(email.trim());
      setBusy(false);
      // Always show the same message, so we don't reveal which emails have accounts.
      setMessage(
        error ?? 'If an account exists for that email, a reset link is on its way.',
      );
      return;
    }

    if (!email.trim()) {
      setError('Enter your email address.');
      return;
    }
    if (mode === 'up') {
      if (!passwordOk(password)) {
        setError('Your password does not meet all the requirements below.');
        return;
      }
      if (password !== confirm) {
        setError("The passwords don't match.");
        return;
      }
    } else if (!password) {
      setError('Enter your password.');
      return;
    }
    setBusy(true);
    const { error } =
      mode === 'in'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    if (mode === 'up') {
      switchTo('in');
      setMessage('Account created. If asked, confirm your email, then sign in.');
    }
    // On sign-in success the session appears and this screen unmounts on its own.
  };

  const cta = mode === 'in' ? 'Sign in' : mode === 'up' ? 'Create account' : 'Send reset link';

  return (
    <div className="auth">
      <div className="auth-inner">
        <h1 className="auth-title">Finance Tracker</h1>
        <p className="auth-sub">
          {mode === 'in'
            ? 'Sign in to reach your data on any device.'
            : mode === 'up'
              ? 'Create an account — your data syncs everywhere you sign in.'
              : "Enter your email and we'll send a link to reset your password."}
        </p>

        <Card>
          <form onSubmit={submit}>
            <Field label="Email">
              <input
                className="input"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            {mode === 'in' && (
              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                />
              </Field>
            )}
            {mode === 'up' && (
              <PasswordFields
                password={password}
                setPassword={setPassword}
                confirm={confirm}
                setConfirm={setConfirm}
              />
            )}

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}

            <Button type="submit" variant="primary">
              {busy ? 'Please wait…' : cta}
            </Button>
          </form>
        </Card>

        <div className="auth-links">
          {mode === 'in' && (
            <button type="button" className="link" onClick={() => switchTo('forgot')}>
              Forgot password?
            </button>
          )}
          <button
            type="button"
            className="link"
            onClick={() => switchTo(mode === 'in' ? 'up' : 'in')}
          >
            {mode === 'in'
              ? 'New here? Create an account'
              : mode === 'up'
                ? 'Already have an account? Sign in'
                : 'Back to sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Shown after following a reset link: set a new password, then you're in. */
export function ResetPassword() {
  const { updatePassword } = useStore();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!passwordOk(password)) {
      setError('Your password does not meet all the requirements below.');
      return;
    }
    if (password !== confirm) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) {
      setError(error);
      return;
    }
    setDone(true);
  };

  return (
    <div className="auth">
      <div className="auth-inner">
        <h1 className="auth-title">Set a new password</h1>
        <p className="auth-sub">Choose a new password for your account.</p>

        <Card>
          {done ? (
            <p className="auth-message">Password updated — you're signed in.</p>
          ) : (
            <form onSubmit={submit}>
              <PasswordFields
                password={password}
                setPassword={setPassword}
                confirm={confirm}
                setConfirm={setConfirm}
                label="New password"
              />
              {error && <p className="auth-error">{error}</p>}
              <Button type="submit" variant="primary">
                {busy ? 'Please wait…' : 'Save new password'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
