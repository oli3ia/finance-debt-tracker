import { useState } from 'react';
import { StoreProvider, useStore } from './store';
import { monthLabel, currentMonthKey } from './lib/format';
import { Auth, ResetPassword } from './Auth';
import { Dashboard } from './tabs/Dashboard';
import { Income } from './tabs/Income';
import { Outgoings } from './tabs/Outgoings';
import { Debts } from './tabs/Debts';
import { Goals } from './tabs/Goals';
import { Settings } from './tabs/Settings';

const TABS = [
  { id: 'dashboard', label: 'Ledger', icon: '◎' },
  { id: 'income', label: 'Income', icon: '↑' },
  { id: 'outgoings', label: 'Out', icon: '↓' },
  { id: 'debts', label: 'Debt', icon: '▤' },
  { id: 'goals', label: 'Goals', icon: '★' },
  { id: 'settings', label: 'More', icon: '⚙' },
] as const;

/** Outgoings are recurring, so they're the only tab the month picker doesn't drive. */
const MONTH_AWARE_TABS = new Set(['dashboard', 'income', 'debts', 'goals']);

function Shell() {
  const { month, stepMonth, setMonth } = useStore();
  const [tab, setTab] = useState<string>('dashboard');

  const isThisMonth = month === currentMonthKey();

  return (
    <div className="app">
      <header className="topbar">
        <h1>Finance Tracker</h1>
        {MONTH_AWARE_TABS.has(tab) && (
          <div className="month-nav">
            <button
              className="month-arrow"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
            >
              ‹
            </button>
            <button
              className="month-current"
              onClick={() => setMonth(currentMonthKey())}
              title="Jump to this month"
            >
              {monthLabel(month)}
              {!isThisMonth && <small>tap for today</small>}
            </button>
            <button
              className="month-arrow"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
            >
              ›
            </button>
          </div>
        )}
      </header>

      <main className="content">
        {tab === 'dashboard' && <Dashboard onGo={setTab} />}
        {tab === 'income' && <Income />}
        {tab === 'outgoings' && <Outgoings />}
        {tab === 'debts' && <Debts />}
        {tab === 'goals' && <Goals />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Decides between the loading state, the sign-in gate, and the app itself. */
function Gate() {
  const { cloudEnabled, authReady, session, recovering } = useStore();

  // Local-only build (no backend configured): straight into the app.
  if (!cloudEnabled) return <Shell />;
  // Wait for the initial session check so we don't flash the sign-in screen.
  if (!authReady) {
    return (
      <div className="auth">
        <div className="auth-inner">
          <p className="auth-sub">Loading…</p>
        </div>
      </div>
    );
  }
  // Following a reset link takes priority — prompt for the new password.
  if (recovering) return <ResetPassword />;
  return session ? <Shell /> : <Auth />;
}

export default function App() {
  return (
    <StoreProvider>
      <Gate />
    </StoreProvider>
  );
}
