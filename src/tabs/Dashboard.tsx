import { useStore } from '../store';
import {
  summarise,
  moneyOutByAccount,
  monthlyRequired,
  openingBalance,
  paymentFor,
  leftToPay,
  totalPayments,
  totalLeftToPay,
  isCleared,
  flexFor,
  isSavingIn,
  goalWindow,
} from '../lib/calc';
import { money, hours, monthLabel } from '../lib/format';
import { Card, Row, Stat, Empty } from '../components/ui';

export function Dashboard({ onGo }: { onGo: (tab: string) => void }) {
  const { state, month } = useStore();
  const s = summarise(state, month);
  const accounts = moneyOutByAccount(state, month);
  const short = s.remaining < 0;
  const active = state.debts.filter((d) => !isCleared(d, month));
  const debtPaying = totalPayments(state.debts, month);
  const leftThisMonth = totalLeftToPay(state.debts, month);
  const flex = flexFor(state.flexPayments, month);
  const savingNow = state.goals.filter((g) => isSavingIn(g, month)).length;

  return (
    <>
      <Card>
        <div className="hero">
          <span className="hero-label">
            {short ? 'Short this month' : 'Remaining to spend'}
          </span>
          <strong className={`hero-value ${short ? 'negative' : 'positive'}`}>
            {money(s.remaining)}
          </strong>
          <span className="hero-sub">
            after outgoings, debt payments and savings · {monthLabel(month)}
          </span>
        </div>
      </Card>

      {short && (
        <Card title="Overtime needed">
          {s.rate > 0 ? (
            <>
              <div className="hero">
                <strong className="hero-value">{hours(s.hoursToBreakEven)}</strong>
                <span className="hero-sub">
                  extra overtime at {money(s.rate)}/hr to cover {money(s.shortfall)}
                </span>
              </div>
              <div className="divider" />
              <Row label="Hours already logged" value={hours(s.overtimeHours)} />
              <Row
                label="Hours needed to break even"
                value={hours(s.overtimeHours + s.hoursToBreakEven)}
                strong
              />
              <p className="note">
                That's the total for the month. You've logged {hours(s.overtimeHours)} so
                far, so {hours(s.hoursToBreakEven)} still to go.
              </p>
            </>
          ) : (
            <Empty>
              Set an hourly rate in{' '}
              <button className="link" onClick={() => onGo('income')}>
                Income
              </button>{' '}
              to see the hours needed.
            </Empty>
          )}
        </Card>
      )}

      <Card title="The ledger">
        <Row label="Base pay" value={money(s.basePay)} />
        <Row
          label="Overtime"
          sub={
            s.overtimeHours > 0
              ? `${hours(s.overtimeHours)} × ${money(s.rate)}`
              : 'no hours logged yet'
          }
          value={money(s.overtimeEarnings)}
        />
        <Row label="Total income" value={money(s.totalIncome)} strong />

        <div className="divider" />

        <Row
          label="Outgoings"
          sub={`${state.outgoings.length} items`}
          value={`− ${money(s.totalOutgoings)}`}
          tone="negative"
        />
        <Row
          label="Debt payments"
          sub={
            s.totalDebtPayments > 0 && s.rate > 0
              ? `${hours(s.hoursToCoverDebt)} of overtime`
              : 'nothing planned this month'
          }
          value={`− ${money(s.totalDebtPayments)}`}
          tone="negative"
        />
        <Row
          label="Savings targets"
          sub={
            state.goals.length === 0
              ? 'no goals'
              : `${savingNow} of ${state.goals.length} goals saving this month`
          }
          value={`− ${money(s.totalSavings)}`}
          tone="negative"
        />
        <Row label="Total committed" value={money(s.committed)} strong />

        <div className="divider" />

        <Row
          label="Remaining cash"
          value={money(s.remaining)}
          tone={short ? 'negative' : 'positive'}
          strong
        />
      </Card>

      <Card title="Debt">
        <div className="stats">
          <Stat label="Owed right now" value={money(s.totalDebt)} />
          <Stat
            label="Debts clear by"
            value={s.payoff.month ? monthLabel(s.payoff.month) : '—'}
            sub={
              s.payoff.month
                ? 'cards and finance'
                : s.payoff.shortfall > 0
                  ? `${money(s.payoff.shortfall)} left unplanned`
                  : 'plan a payment'
            }
          />
        </div>
        {state.debts.length === 0 ? (
          <Empty>
            No debts tracked.{' '}
            <button className="link" onClick={() => onGo('debts')}>
              Add one →
            </button>
          </Empty>
        ) : active.length === 0 ? (
          <Empty>Everything's paid off 🎉</Empty>
        ) : (
          // Debts paid off in an earlier month are gone from this one.
          active.map((d) => {
            const payment = paymentFor(d, month);
            const opening = Math.max(0, openingBalance(d, month));
            const left = leftToPay(d, month);
            return (
              <Row
                key={d.id}
                label={d.name || 'Untitled'}
                sub={
                  payment <= 0
                    ? 'no payment planned'
                    : left <= 0.005
                      ? `${money(payment)} paid this month ✓`
                      : `${money(left)} left of ${money(payment)} this month`
                }
                value={money(opening)}
              />
            );
          })
        )}

        {debtPaying > 0 && (
          <>
            <div className="divider" />
            <Row
              label={`Left to pay in ${monthLabel(month)}`}
              sub="across your cards & loans, after payments logged"
              value={leftThisMonth <= 0.005 ? 'All paid ✓' : money(leftThisMonth)}
              tone={leftThisMonth <= 0.005 ? 'positive' : undefined}
              strong
            />
          </>
        )}

        {flex.length > 0 && (
          <>
            <div className="divider" />
            <p className="section-label">One-off this month</p>
            {flex.map((f) => (
              <Row
                key={f.id}
                label={f.name || 'Untitled'}
                sub="no balance tracked"
                value={money(f.amount)}
              />
            ))}
          </>
        )}
      </Card>

      <Card title={`Money out by account — ${monthLabel(month)}`}>
        {accounts.length === 0 ? (
          <Empty>
            Nothing logged.{' '}
            <button className="link" onClick={() => onGo('outgoings')}>
              Add outgoings →
            </button>
          </Empty>
        ) : (
          <>
            {accounts.map((a) => (
              <Row key={a.account} label={a.account} value={money(a.total)} />
            ))}
            <div className="divider" />
            <Row
              label="Total"
              sub="outgoings, debt payments and one-offs"
              value={money(s.totalOutgoings + s.totalDebtPayments)}
              strong
            />
          </>
        )}
      </Card>

      {state.goals.length > 0 && (
        <Card title="Savings goals">
          {state.goals.map((g) => {
            const saving = isSavingIn(g, month);
            const w = goalWindow(g);
            return (
              <Row
                key={g.id}
                label={g.name || 'Untitled goal'}
                sub={
                  saving
                    ? `${money(g.saved)} of ${money(g.targetCost)} · until ${monthLabel(w.end)}`
                    : month > w.end
                      ? `finished ${monthLabel(w.end)}`
                      : `starts ${monthLabel(w.start)}`
                }
                value={saving ? `${money(monthlyRequired(g, month))}/mo` : '—'}
                tone={saving ? undefined : 'muted'}
              />
            );
          })}
          <div className="divider" />
          <Row label={`Set aside in ${monthLabel(month)}`} value={money(s.totalSavings)} strong />
        </Card>
      )}
    </>
  );
}
