import { useState } from 'react';
import { useStore } from './store';
import { Card, Field, Button } from './components/ui';

type Mode = 'in' | 'up' | 'forgot';

/** The sign-in / sign-up / forgot-password gate, shown when nobody's signed in. */
export function Auth() {
  const { signIn, signUp, sendPasswordReset } = useStore();
  const [mode, setMode] = useState<Mode>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const switchTo = (next: Mode) => {
    setMode(next);
    setError('');
    setMessage('');
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

    if (!email.trim() || password.length < 6) {
      setError('Enter an email and a password of at least 6 characters.');
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
      setMessage('Account created. If asked, confirm your email, then sign in.');
      switchTo('in');
      setPassword('');
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
            {mode !== 'forgot' && (
              <Field label="Password">
                <input
                  className="input"
                  type="password"
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </Field>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Choose a password of at least 6 characters.');
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
              <Field label="New password">
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </Field>
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
