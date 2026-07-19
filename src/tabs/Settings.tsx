import { useRef, useState } from 'react';
import { useStore } from '../store';
import type { AppState } from '../types';
import { Card, Row, Button, Empty } from '../components/ui';
import { PasswordFields } from '../components/PasswordFields';
import { passwordOk } from '../lib/password';

const SYNC_LABEL: Record<string, string> = {
  idle: 'Synced to your account',
  syncing: 'Syncing…',
  error: "Couldn't reach the cloud — changes are saved on this device and will sync later",
  offline: 'Offline — changes are saved here and will sync when you reconnect',
};

export function Settings() {
  const {
    state,
    replaceAll,
    loadSample,
    clearAll,
    cloudEnabled,
    session,
    syncStatus,
    signOut,
    updatePassword,
  } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMessage, setPwMessage] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  const changePassword = async () => {
    setPwMessage('');
    if (!passwordOk(newPassword)) {
      setPwMessage('Your password does not meet all the requirements listed.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage("The passwords don't match.");
      return;
    }
    setPwBusy(true);
    const { error } = await updatePassword(newPassword);
    setPwBusy(false);
    setPwMessage(error ?? 'Password updated.');
    if (!error) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Backup downloaded.');
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.outgoings)) {
        throw new Error('unrecognised file');
      }
      replaceAll(parsed);
      setMessage('Backup restored.');
    } catch {
      setMessage("Couldn't read that file — is it a backup exported from this app?");
    }
  };

  const confirmAnd = (prompt: string, fn: () => void, done: string) => () => {
    if (window.confirm(prompt)) {
      fn();
      setMessage(done);
    }
  };

  return (
    <>
      {cloudEnabled && session && (
        <Card title="Account">
          <Row label="Signed in as" value={session.user.email ?? 'your account'} />
          <Row label="Status" value={SYNC_LABEL[syncStatus] ?? 'Synced'} />

          <div className="divider" />

          <p className="section-label">Change password</p>
          <PasswordFields
            password={newPassword}
            setPassword={setNewPassword}
            confirm={confirmPassword}
            setConfirm={setConfirmPassword}
            label="New password"
          />
          <div className="btn-row">
            <Button onClick={() => void changePassword()}>
              {pwBusy ? 'Saving…' : 'Update password'}
            </Button>
            <Button onClick={() => void signOut()}>Sign out</Button>
          </div>
          {pwMessage && <p className="note">{pwMessage}</p>}

          <p className="note">
            Your data is saved to your account and synced to every device you sign in on.
          </p>
        </Card>
      )}

      <Card title="Backup">
        <p className="note">
          {cloudEnabled && session
            ? 'Your data syncs to your account. Export a copy any time for your own records.'
            : 'Your data lives only in this browser. Export a copy before clearing site data, switching phone, or reinstalling.'}
        </p>
        <div className="btn-row">
          <Button onClick={exportJson}>Export backup</Button>
          <Button onClick={() => fileRef.current?.click()}>Import backup</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importJson(file);
            e.target.value = '';
          }}
        />
      </Card>

      <Card title="Demo &amp; reset">
        <p className="note">
          New here? Load a set of made-up sample figures to see every tab populated, then
          clear it and enter your own. Nothing is sent anywhere — it all stays in this browser.
        </p>
        <div className="btn-row">
          <Button
            onClick={confirmAnd(
              'Load the demo data? This replaces whatever is here now.',
              loadSample,
              'Demo data loaded — explore the tabs, then clear it when you’re ready.',
            )}
          >
            Load demo data
          </Button>
          <Button
            variant="danger"
            onClick={confirmAnd(
              'Delete all data and start from scratch? This cannot be undone.',
              clearAll,
              'All data cleared — the app is now a blank slate.',
            )}
          >
            Clear all data
          </Button>
        </div>
      </Card>

      {message && (
        <Card>
          <Empty>{message}</Empty>
        </Card>
      )}

      <Card title="About">
        <p className="note">
          A mobile-first tracker for income, outgoings, debts and savings goals. Add it to
          your home screen for an app-like, offline-capable experience: in Safari tap Share →
          Add to Home Screen; in Chrome tap ⋮ → Add to Home screen.
        </p>
      </Card>
    </>
  );
}
