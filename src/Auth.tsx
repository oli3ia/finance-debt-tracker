import { useState } from 'react';
import { useStore } from './store';
import { Card, Field, Button } from './components/ui';

/** The sign-in / sign-up gate, shown when cloud sync is on and nobody's signed in. */
export function Auth() {
  const { signIn, signUp } = useStore();
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
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
      // With email confirmation on, there's no session yet — tell them to check mail.
      setMessage('Account created. If asked, confirm your email, then sign in.');
      setMode('in');
      setPassword('');
    }
    // On sign-in success the session appears and this screen unmounts on its own.
  };

  return (
    <div className="auth">
      <div className="auth-inner">
        <h1 className="auth-title">Finance Tracker</h1>
        <p className="auth-sub">
          {mode === 'in'
            ? 'Sign in to reach your data on any device.'
            : 'Create an account — your data syncs everywhere you sign in.'}
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

            {error && <p className="auth-error">{error}</p>}
            {message && <p className="auth-message">{message}</p>}

            <Button type="submit" variant="primary">
              {busy ? 'Please wait…' : mode === 'in' ? 'Sign in' : 'Create account'}
            </Button>
          </form>
        </Card>

        <button
          type="button"
          className="link auth-switch"
          onClick={() => {
            setMode((m) => (m === 'in' ? 'up' : 'in'));
            setError('');
            setMessage('');
          }}
        >
          {mode === 'in'
            ? "New here? Create an account"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}
