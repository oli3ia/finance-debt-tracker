import { useState } from 'react';
import { useStore } from '../store';
import {
  openingBalance,
  closingBalance,
  paymentFor,
  totalOwed,
  totalPayments,
  payoff,
  schedule,
  rateFor,
  isCleared,
  clearedMonth,
  plannedPayment,
  excessPlanned,
  contributionsFor,
  contributedFor,
  leftToPay,
  totalLeftToPay,
  totalContributed,
  flexFor,
  flexTotal,
  flexNames,
} from '../lib/calc';
import {
  money,
  hours,
  monthLabel,
  shiftMonth,
  monthBounds,
  dayLabel,
} from '../lib/format';
import type { Debt } from '../types';
import {
  Card,
  Row,
  Stat,
  Field,
  NumberInput,
  TextInput,
  Button,
  DeleteButton,
  Empty,
  Suggestions,
} from '../components/ui';

/** One card or loan, for the month on screen. */
function DebtEntry({ debt, month }: { debt: Debt; month: string }) {
  const {
    updateDebt,
    setDebtPayment,
    repeatDebtPayment,
    trimDebtPlan,
    addDebtContribution,
    updateDebtContribution,
    removeDebtContribution,
    removeDebt,
  } = useStore();
  const [repeatTo, setRepeatTo] = useState(shiftMonth(month, 11));

  const { min, max } = monthBounds(month);
  const [payDate, setPayDate] = useState(min);
  const [payAmount, setPayAmount] = useState(0);

  const opening = openingBalance(debt, month);
  const closing = closingBalance(debt, month);
  const planned = plannedPayment(debt, month);
  const payment = paymentFor(debt, month);
  const clearsThisMonth = closing <= 0.005 && opening > 0.005;
  // Money the plan asks for that will never actually be taken.
  const excess = excessPlanned(debt);
  const cappedThisMonth = planned > payment + 0.005;

  const logged = contributionsFor(debt, month);
  const putIn = contributedFor(debt, month);
  const left = leftToPay(debt, month);
  const fullyPaid = payment > 0.005 && left <= 0.005;

  const logPayment = () => {
    if (payAmount <= 0) return;
    // Guard against a date picker that ignored min/max.
    const day = payDate >= min && payDate <= max ? payDate : min;
    addDebtContribution(debt.id, day, payAmount);
    setPayAmount(0);
  };

  return (
    <li className="entry">
      <div className="entry-head">
        <TextInput
          value={debt.name}
          onChange={(name) => updateDebt(debt.id, { name })}
          placeholder="Name, e.g. Credit Card"
        />
        <DeleteButton
          onClick={() => removeDebt(debt.id)}
          label={`Delete ${debt.name || 'debt'}`}
        />
      </div>

      <div className="entry-grid">
        <Field label="Starting balance">
          <NumberInput
            value={debt.startBalance}
            onChange={(startBalance) => updateDebt(debt.id, { startBalance })}
            prefix="£"
          />
        </Field>
        <Field label="As of">
          <input
            className="input"
            type="month"
            value={debt.startMonth}
            onChange={(e) => updateDebt(debt.id, { startMonth: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Paid from">
        <TextInput
          value={debt.account}
          onChange={(account) => updateDebt(debt.id, { account })}
          placeholder="e.g. Main Account"
          list="accounts"
        />
      </Field>

      <div className="divider" />

      <Row label="Owed at start of month" value={money(opening)} />
      <Field
        label={`Paying in ${monthLabel(month)}`}
        hint={
          cappedThisMonth
            ? `Only ${money(opening)} is left to pay, so ${money(payment)} is taken — not ${money(planned)}.`
            : undefined
        }
      >
        <NumberInput
          value={planned}
          onChange={(amount) => setDebtPayment(debt.id, month, amount)}
          prefix="£"
        />
      </Field>

      {payment > 0 && (
        <Field label="Repeat that payment every month until">
          <div className="repeat">
            <input
              className="input"
              type="month"
              value={repeatTo}
              min={month}
              onChange={(e) => setRepeatTo(e.target.value)}
            />
            <Button
              onClick={() => repeatDebtPayment(debt.id, month, repeatTo, planned)}
            >
              Apply
            </Button>
          </div>
        </Field>
      )}

      <Row
        label="Left after payment"
        value={money(closing)}
        tone={closing <= 0.005 ? 'positive' : undefined}
        strong
      />

      {payment > 0.005 && (
        <>
          <div className="divider" />

          <Row
            label={`Left to pay in ${monthLabel(month)}`}
            sub={putIn > 0 ? `${money(putIn)} put in of ${money(payment)}` : undefined}
            value={fullyPaid ? 'Paid ✓' : money(left)}
            tone={fullyPaid ? 'positive' : undefined}
            strong
          />

          <div className="log-form">
            <Field label="Date">
              <input
                className="input"
                type="date"
                value={payDate}
                min={min}
                max={max}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </Field>
            <Field label="Amount put in">
              <NumberInput value={payAmount} onChange={setPayAmount} prefix="£" />
            </Field>
          </div>
          <Button variant="primary" onClick={logPayment}>
            + Log payment
          </Button>

          {logged.length > 0 && (
            <ul className="list">
              {logged.map((c) => (
                <li key={c.id} className="list-item">
                  <div className="list-main">
                    <span className="list-title">{dayLabel(c.date)}</span>
                  </div>
                  <div className="list-edit">
                    <NumberInput
                      value={c.amount}
                      onChange={(amount) => updateDebtContribution(debt.id, c.id, { amount })}
                      prefix="£"
                    />
                    <DeleteButton
                      onClick={() => removeDebtContribution(debt.id, c.id)}
                      label={`Delete payment on ${c.date}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {clearsThisMonth && (
        <p className="entry-foot">
          Paid off this month 🎉 It drops off the list from {monthLabel(shiftMonth(month, 1))}.
        </p>
      )}

      {excess > 0.005 && (
        <div className="warn">
          <p>
            Your plan asks for {money(excess)} more than this debt is worth. Those payments
            won't be taken — the debt clears
            {clearedMonth(debt) ? ` in ${monthLabel(clearedMonth(debt)!)}` : ''} and nothing
            is charged after that.
          </p>
          <Button onClick={() => trimDebtPlan(debt.id)}>Trim plan to the balance</Button>
        </div>
      )}
    </li>
  );
}

export function Debts() {
  const {
    state,
    month,
    addDebt,
    addFlexPayment,
    updateFlexPayment,
    removeFlexPayment,
  } = useStore();
  const { debts, flexPayments, outgoings } = state;

  const owed = totalOwed(debts, month);
  const debtPaying = totalPayments(debts, month);
  const flex = flexFor(flexPayments, month);
  const flexPaying = flexTotal(flexPayments, month);
  const paying = debtPaying + flexPaying;

  const putIn = totalContributed(debts, month);
  const leftThisMonth = totalLeftToPay(debts, month);

  const rate = rateFor(state, month);
  const plan = payoff(debts, month);
  const upcoming = schedule(debts, flexPayments, month, 12);

  const active = debts.filter((d) => !isCleared(d, month));
  const cleared = debts.filter((d) => isCleared(d, month));

  const accounts = [
    ...outgoings.map((o) => o.account),
    ...debts.map((d) => d.account),
    ...flexPayments.map((f) => f.account),
  ];

  return (
    <>
      <Suggestions id="accounts" values={accounts} />
      <Suggestions id="flex-names" values={flexNames(flexPayments)} />

      <Card title={`Summary — ${monthLabel(month)}`}>
        <div className="stats">
          <Stat label="Owed right now" value={money(owed)} />
          <Stat
            label="Paying this month"
            value={money(paying)}
            sub={
              flexPaying > 0
                ? `incl. ${money(flexPaying)} one-off`
                : `leaves ${money(Math.max(0, owed - debtPaying))} owed`
            }
          />
        </div>
        {debtPaying > 0 && (
          <Row
            label={`Left to pay in ${monthLabel(month)}`}
            sub={
              putIn > 0
                ? `${money(putIn)} put in of ${money(debtPaying)} across your cards & loans`
                : 'log payments against each debt as you make them'
            }
            value={leftThisMonth <= 0.005 ? 'All paid ✓' : money(leftThisMonth)}
            tone={leftThisMonth <= 0.005 ? 'positive' : undefined}
            strong
          />
        )}
        {paying > 0 && rate > 0 && (
          <Row
            label="Overtime to cover this month"
            sub={`at ${money(rate)}/hr`}
            value={hours(paying / rate)}
          />
        )}
        <Row
          label="Debts clear by"
          sub={
            plan.month
              ? 'cards and finance, on the current plan'
              : plan.shortfall > 0
                ? `plan leaves ${money(plan.shortfall)} unpaid`
                : 'add a planned payment'
          }
          value={plan.month ? monthLabel(plan.month) : '—'}
          tone={plan.month ? 'positive' : undefined}
        />
        <p className="note">
          Anything with no end date — student finance, say — belongs in Outgoings, not
          here. It can't be paid off, so it can't have a date.
        </p>
      </Card>

      <Card
        title="Cards & loans"
        action={
          <Button variant="primary" onClick={addDebt}>
            + Add
          </Button>
        }
      >
        {debts.length === 0 ? (
          <Empty>Nothing tracked. Add a credit card, loan or finance above.</Empty>
        ) : active.length === 0 ? (
          <Empty>Everything's paid off 🎉</Empty>
        ) : (
          <ul className="list">
            {active.map((d) => (
              <DebtEntry key={d.id} debt={d} month={month} />
            ))}
          </ul>
        )}
      </Card>

      <Card
        title={`One-off payments — ${monthLabel(month)}`}
        action={
          <Button variant="primary" onClick={() => addFlexPayment(month)}>
            + Add
          </Button>
        }
      >
        {flex.length === 0 ? (
          <Empty>
            Nothing this month. Add a one-off for things like a buy-now-pay-later instalment,
            where the amount differs each month and there's no balance to track.
          </Empty>
        ) : (
          <>
            <ul className="list">
              {flex.map((f) => (
                <li key={f.id} className="entry">
                  <div className="entry-head">
                    <TextInput
                      value={f.name}
                      onChange={(name) => updateFlexPayment(f.id, { name })}
                      placeholder="e.g. Buy Now Pay Later"
                      list="flex-names"
                    />
                    <DeleteButton
                      onClick={() => removeFlexPayment(f.id)}
                      label={`Delete ${f.name || 'payment'}`}
                    />
                  </div>
                  <div className="entry-grid">
                    <Field label="Amount">
                      <NumberInput
                        value={f.amount}
                        onChange={(amount) => updateFlexPayment(f.id, { amount })}
                        prefix="£"
                      />
                    </Field>
                    <Field label="Paid from">
                      <TextInput
                        value={f.account}
                        onChange={(account) => updateFlexPayment(f.id, { account })}
                        placeholder="e.g. Main Account"
                        list="accounts"
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
            <div className="divider" />
            <Row label={`Total for ${monthLabel(month)}`} value={money(flexPaying)} strong />
          </>
        )}
        <p className="note">
          These belong to {monthLabel(month)} alone. They don't appear in any other month,
          and deleting one only ever affects this one.
        </p>
      </Card>

      {cleared.length > 0 && (
        <Card title="Paid off">
          {cleared.map((d) => {
            const done = clearedMonth(d);
            return (
              <Row
                key={d.id}
                label={d.name || 'Untitled'}
                sub={done ? `cleared ${monthLabel(done)}` : 'cleared'}
                value={money(d.startBalance)}
                tone="muted"
              />
            );
          })}
          <p className="note">
            Kept for the record, and out of the way. Step back to a month when it was still
            owed and it'll be there, payments and all.
          </p>
        </Card>
      )}

      {debts.length > 0 && (
        <Card title="Plan — next 12 months">
          <div className="plan-head">
            <span>Month</span>
            <span>Paying</span>
            <span>Left</span>
          </div>
          {upcoming.map((row) => (
            <div
              key={row.month}
              className={`plan-row${row.month === month ? ' current' : ''}`}
            >
              <span>{monthLabel(row.month).replace(/ 20/, ' ’')}</span>
              <span>{row.payment > 0 ? money(row.payment) : '—'}</span>
              <span>{money(row.remaining)}</span>
            </div>
          ))}
          <p className="note">
            Step through the months above to plan each payment. Anything left blank counts
            as nothing paid that month.
          </p>
        </Card>
      )}
    </>
  );
}
