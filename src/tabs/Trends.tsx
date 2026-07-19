import { useState } from 'react';
import { useStore } from '../store';
import {
  earliestMonth,
  debtSeries,
  remainingSeries,
  spendingByCategory,
} from '../lib/calc';
import { money, monthLabel, shiftMonth, monthsBetween } from '../lib/format';
import { Card, Empty } from '../components/ui';

const CAT_VARS = [
  'var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)',
  'var(--cat-5)', 'var(--cat-6)', 'var(--cat-7)', 'var(--cat-8)',
];

const shortMonth = (m: string) => monthLabel(m).replace(/ 20/, " '");

/** A falling area line for total debt over the window. */
function DebtArea({ points }: { points: { month: string; value: number }[] }) {
  const W = 300;
  const H = 96;
  const pad = 8;
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const xy = points.map((p, i) => {
    const x = n > 1 ? (i / (n - 1)) * W : W / 2;
    const y = H - pad - (p.value / max) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const [ex, ey] = xy[xy.length - 1];

  return (
    <svg className="tr-area" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Total debt over time">
      <line x1="0" y1={pad} x2={W} y2={pad} stroke="var(--grid)" strokeWidth="1" />
      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--grid)" strokeWidth="1" />
      <defs>
        <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.24" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#trend-fill)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={ex} cy={ey} r="3.5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
    </svg>
  );
}

/** Bars above/below a zero baseline for money left each month. */
function LeftBars({ points }: { points: { month: string; value: number }[] }) {
  const W = 300;
  const H = 92;
  const mid = H / 2;
  const maxAbs = Math.max(1, ...points.map((p) => Math.abs(p.value)));
  const n = points.length;
  const slot = W / n;
  const bw = Math.min(20, slot * 0.6);

  return (
    <svg className="tr-updown" viewBox={`0 0 ${W} ${H}`} aria-label="Money left at the end of each month">
      {points.map((p, i) => {
        const h = (Math.abs(p.value) / maxAbs) * (mid - 6);
        const x = i * slot + (slot - bw) / 2;
        const y = p.value >= 0 ? mid - h : mid;
        return (
          <rect
            key={p.month}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            width={bw.toFixed(1)}
            height={Math.max(2, h).toFixed(1)}
            rx="3"
            fill={p.value >= 0 ? 'var(--positive)' : 'var(--negative)'}
          >
            <title>{`${monthLabel(p.month)}: ${money(p.value)}`}</title>
          </rect>
        );
      })}
      <line x1="0" y1={mid} x2={W} y2={mid} stroke="var(--border)" strokeWidth="1.5" />
    </svg>
  );
}

export function Trends() {
  const { state, month } = useStore();
  const [range, setRange] = useState(12);

  const earliest = earliestMonth(state);
  const desiredStart = shiftMonth(month, -(range - 1));
  const start = earliest && earliest > desiredStart ? earliest : desiredStart;
  const count = Math.max(1, monthsBetween(start, month) + 1);

  const debt = debtSeries(state.debts, start, count);
  const remaining = remainingSeries(state, start, count);
  const cats = spendingByCategory(state, month);

  const paidOff = Math.max(0, debt[0].value - debt[count - 1].value);
  const totalSaved = state.goals.reduce((sum, g) => sum + g.saved, 0);
  const avgLeft = remaining.reduce((sum, p) => sum + p.value, 0) / count;
  const shortMonths = remaining.filter((p) => p.value < -0.005).length;

  // Stable colour per category (by name), so a category keeps its colour regardless
  // of where it ranks this month.
  const nameOrder = new Map([...cats].map((c) => c.category).sort().map((name, i) => [name, i]));
  const catColor = (name: string) => CAT_VARS[nameOrder.get(name) ?? 99] ?? 'var(--muted)';
  const catMax = Math.max(1, ...cats.map((c) => c.amount));

  const hasData = state.debts.length > 0 || state.outgoings.length > 0 || state.goals.length > 0;
  const enoughHistory = count >= 2;

  if (!hasData) {
    return (
      <Card title="Trends">
        <Empty>
          Nothing to chart yet. Add income, outgoings, debts or goals, and your history builds
          from there.
        </Empty>
      </Card>
    );
  }

  return (
    <>
      <Card title="Trends">
        <div className="rangepick">
          <button className={range === 6 ? 'on' : ''} onClick={() => setRange(6)} type="button">6 mo</button>
          <button className={range === 12 ? 'on' : ''} onClick={() => setRange(12)} type="button">12 mo</button>
        </div>
        <div className="tr-tiles">
          <div className="tr-tile">
            <span className="t-label">Paid off</span>
            <strong className="t-val positive">{money(paidOff)}</strong>
            <span className="t-note">over {count} mo</span>
          </div>
          <div className="tr-tile">
            <span className="t-label">Saved</span>
            <strong className="t-val">{money(totalSaved)}</strong>
            <span className="t-note">across goals</span>
          </div>
          <div className="tr-tile">
            <span className="t-label">Avg left / mo</span>
            <strong className={`t-val${avgLeft >= 0 ? ' positive' : ' negative'}`}>{money(avgLeft)}</strong>
            <span className="t-note">this window</span>
          </div>
        </div>
        <p className="note">
          Reconstructed from your plan and logged history — outgoings are counted as recurring,
          so treat it as a guide, not a bank statement.
        </p>
      </Card>

      {enoughHistory ? (
        <>
          <Card title="Total debt">
            <div className="tr-lead">
              <span className="tr-big">{money(debt[count - 1].value)}</span>
              {paidOff > 0.005 && <span className="tr-delta">▼ {money(paidOff)} over {count} mo</span>}
            </div>
            <DebtArea points={debt} />
            <div className="tr-xaxis">
              <span>{shortMonth(start)}</span>
              <span>{shortMonth(month)}</span>
            </div>
          </Card>

          <Card title="Left at month-end">
            <p className="note" style={{ marginTop: 0 }}>What was spare (or short) after everything went out</p>
            <LeftBars points={remaining} />
            <div className="tr-legend">
              <span className="k"><span className="sw" style={{ background: 'var(--positive)' }} />Surplus · {count - shortMonths} mo</span>
              <span className="k"><span className="sw" style={{ background: 'var(--negative)' }} />Short · {shortMonths} mo</span>
            </div>
          </Card>
        </>
      ) : (
        <Card title="Over time">
          <Empty>
            Trends fill in as you step through more months. Come back once you've used the app
            across a few, and the debt line and month-by-month view appear here.
          </Empty>
        </Card>
      )}

      <Card title={`Where it went — ${monthLabel(month)}`}>
        {cats.length === 0 ? (
          <Empty>Nothing going out this month.</Empty>
        ) : (
          <div className="tr-cat">
            {cats.map((c) => (
              <div className="tr-catrow" key={c.category}>
                <span className="cname">
                  <span className="sw" style={{ background: catColor(c.category) }} />
                  {c.category}
                </span>
                <span className="camt">{money(c.amount)}</span>
                <div className="tr-cbar">
                  <i style={{ width: `${(c.amount / catMax) * 100}%`, background: catColor(c.category) }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
