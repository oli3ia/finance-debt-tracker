import type { AppState, MonthKey, Debt, FlexPayment, Goal, Outgoing } from '../types';
import { monthKeyOf, monthsBetween, shiftMonth } from './format';

/** The rate/pay in force for a month: the month's override, else the global default. */
export function rateFor(state: AppState, month: MonthKey): number {
  return state.monthOverrides[month]?.hourlyRate ?? state.hourlyRate;
}

export function basePayFor(state: AppState, month: MonthKey): number {
  return state.monthOverrides[month]?.basePay ?? state.basePay;
}

export function overtimeFor(state: AppState, month: MonthKey) {
  const entries = state.overtime
    .filter((e) => monthKeyOf(e.date) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
  const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
  const rate = rateFor(state, month);
  return { entries, totalHours, earnings: totalHours * rate, rate };
}

/* ---------- Outgoings ---------- */

/** Sub-totals per destination account, largest first. */
export function groupByAccount(outgoings: Outgoing[]) {
  const totals = new Map<string, number>();
  for (const o of outgoings) {
    const key = o.account.trim() || 'Unassigned';
    totals.set(key, (totals.get(key) ?? 0) + o.amount);
  }
  return [...totals.entries()]
    .map(([account, total]) => ({ account, total }))
    .sort((a, b) => b.total - a.total);
}

/**
 * Everything leaving your accounts in `month`, grouped by where it leaves from:
 * outgoings, card and finance payments, and one-offs. This is the number you act on —
 * how much to move into each pot — so it has to cover all three.
 */
export function moneyOutByAccount(state: AppState, month: MonthKey) {
  const totals = new Map<string, number>();
  const add = (account: string, amount: number) => {
    const key = account.trim() || 'Unassigned';
    totals.set(key, (totals.get(key) ?? 0) + amount);
  };

  // Outgoings are added even at £0, so an empty pot still shows up as a line.
  for (const o of state.outgoings) add(o.account, o.amount);
  for (const d of state.debts) {
    const paid = paymentFor(d, month);
    if (paid > 0) add(d.account, paid);
  }
  for (const f of flexFor(state.flexPayments, month)) {
    if (f.amount > 0) add(f.account, f.amount);
  }

  return [...totals.entries()]
    .map(([account, total]) => ({ account, total }))
    .sort((a, b) => b.total - a.total);
}

export function groupByCategory(outgoings: Outgoing[]) {
  const totals = new Map<string, Outgoing[]>();
  for (const o of outgoings) {
    const key = o.category.trim() || 'Uncategorised';
    totals.set(key, [...(totals.get(key) ?? []), o]);
  }
  return [...totals.entries()].map(([category, items]) => ({
    category,
    items,
    total: items.reduce((sum, i) => sum + i.amount, 0),
  }));
}

/* ---------- Debt ----------
 * Month keys are `YYYY-MM`, so they sort and compare correctly as plain strings.
 */

/** What you typed into the plan for this month — before reality is applied. */
export function plannedPayment(debt: Debt, month: MonthKey): number {
  return debt.payments[month] ?? 0;
}

/** The months a debt has payments planned for, in order, from `startMonth` onwards. */
function plannedMonths(debt: Debt): MonthKey[] {
  return Object.keys(debt.payments)
    .filter((m) => m >= debt.startMonth)
    .sort();
}

/**
 * Walks the plan forward from `startMonth`, taking each payment off the balance but
 * never taking more than is actually owed. This is the whole model in one loop:
 *
 *   balance ← startBalance
 *   each month: balance ← balance − min(planned, balance)
 *
 * so payments can never overshoot, the balance can never go negative, and the sum of
 * what you actually pay is always exactly what you owed.
 */
function balanceAt(debt: Debt, month: MonthKey): number {
  let balance = debt.startBalance;
  for (const m of plannedMonths(debt)) {
    if (m >= month) break;
    balance -= Math.min(debt.payments[m], balance);
    if (balance <= 0) return 0;
  }
  return Math.max(0, balance);
}

/**
 * What actually leaves your account this month: the planned amount, or whatever is
 * left to pay if that's less. Once the debt is clear this is zero, no matter what the
 * plan still says.
 */
export function paymentFor(debt: Debt, month: MonthKey): number {
  const owed = balanceAt(debt, month);
  if (owed <= 0.005) return 0;
  return Math.min(plannedPayment(debt, month), owed);
}

/** Planned payments that will never be taken, because the debt clears first. */
export function excessPlanned(debt: Debt): number {
  const planned = plannedMonths(debt).reduce((sum, m) => sum + debt.payments[m], 0);
  return Math.max(0, planned - debt.startBalance);
}

/* ---------- Flexible one-off payments ---------- */

/** The standalone payments that belong to this month, and only this month. */
export function flexFor(flex: FlexPayment[], month: MonthKey): FlexPayment[] {
  return flex.filter((f) => f.month === month);
}

export function flexTotal(flex: FlexPayment[], month: MonthKey): number {
  return flexFor(flex, month).reduce((sum, f) => sum + f.amount, 0);
}

/** Names used before, to offer as suggestions when adding another. */
export function flexNames(flex: FlexPayment[]): string[] {
  return [...new Set(flex.map((f) => f.name.trim()).filter(Boolean))].sort();
}

/** What's still owed at the start of `month`, after every earlier payment. Never negative. */
export function openingBalance(debt: Debt, month: MonthKey): number {
  return balanceAt(debt, month);
}

/** What's left once this month's payment lands. Never negative. */
export function closingBalance(debt: Debt, month: MonthKey): number {
  return openingBalance(debt, month) - paymentFor(debt, month);
}

/**
 * True once earlier payments have already finished this debt off, so there's
 * nothing left to pay in `month`. The month of the *final* payment is not cleared —
 * you're still paying that one. A brand-new debt sitting at £0 hasn't been paid off,
 * it just hasn't been filled in yet, so it never counts as cleared.
 */
export function isCleared(debt: Debt, month: MonthKey): boolean {
  return (
    debt.startBalance > 0 && openingBalance(debt, month) <= 0.005
  );
}

/** The month the payments finish a debt off, if they ever do. */
export function clearedMonth(debt: Debt): MonthKey | null {
  if (debt.startBalance <= 0) return null;
  for (const month of plannedMonths(debt)) {
    if (closingBalance(debt, month) <= 0.005) return month;
  }
  return null;
}

/** The last month any debt has a payment planned for. */
function lastPlannedMonth(debts: Debt[]): MonthKey | null {
  const months = debts.flatMap((d) => Object.keys(d.payments));
  return months.length ? months.sort().at(-1)! : null;
}

/**
 * Month-by-month projection: what you pay, and what's left afterwards.
 * This is the `Total per month` / `Debt` pair of rows from the original sheet.
 */
export function schedule(
  debts: Debt[],
  flex: FlexPayment[],
  from: MonthKey,
  count: number,
) {
  return Array.from({ length: count }, (_, i) => {
    const month = shiftMonth(from, i);
    // Everything you pay out, but only what's genuinely still owed.
    const payment = totalPayments(debts, month) + flexTotal(flex, month);
    const remaining = debts.reduce(
      (sum, d) => sum + Math.max(0, closingBalance(d, month)),
      0,
    );
    return { month, payment, remaining };
  });
}

/** Total still owed at the start of `month`. */
export function totalOwed(debts: Debt[], month: MonthKey): number {
  return debts.reduce((sum, d) => sum + Math.max(0, openingBalance(d, month)), 0);
}

/** Planned payments against balances this month. Flexible one-offs are separate. */
export function totalPayments(debts: Debt[], month: MonthKey): number {
  return debts.reduce((sum, d) => sum + paymentFor(d, month), 0);
}

/**
 * Where the current plan lands. Payments vary month to month, so this walks the
 * schedule rather than dividing — the plan either clears the debt in some month,
 * or it runs out with a balance still owing.
 */
export function payoff(debts: Debt[], from: MonthKey) {
  const withBalance = debts.filter((d) => d.startBalance > 0);
  if (withBalance.length === 0) return { month: null, shortfall: 0 };

  const last = lastPlannedMonth(withBalance);
  if (!last) return { month: null, shortfall: totalOwed(withBalance, from) };

  const span = Math.max(0, monthsBetween(from, last)) + 1;
  for (let i = 0; i < span; i++) {
    const month = shiftMonth(from, i);
    // Clamp each debt at zero. Without this, overpaying one card gives it a negative
    // balance that cancels out another card's real debt, and the whole set looks clear
    // while money is still owed.
    const remaining = withBalance.reduce(
      (sum, d) => sum + Math.max(0, closingBalance(d, month)),
      0,
    );
    if (remaining <= 0.005) return { month, shortfall: 0 };
  }

  // The plan ran out of months with something still owing.
  const shortfall = withBalance.reduce((sum, d) => sum + Math.max(0, closingBalance(d, last)), 0);
  return { month: null, shortfall };
}

/* ---------- Savings goals ---------- */

/**
 * The exact span of months a goal is saved over: it starts when you say it starts,
 * runs for a fixed number of months, and then it's done. Outside that window the goal
 * costs nothing — which is what stops a finished goal quietly draining every month
 * forever.
 */
export function goalWindow(goal: Goal): { start: MonthKey; end: MonthKey; months: number } {
  const start = goal.startMonth;
  if (goal.mode === 'months') {
    const months = Math.max(1, Math.round(goal.months) || 1);
    return { start, end: shiftMonth(start, months - 1), months };
  }
  // A target month at or before the start still needs one month to save in.
  const end = goal.targetMonth < start ? start : goal.targetMonth;
  return { start, end, months: Math.max(1, monthsBetween(start, end) + 1) };
}

/** Is this goal being saved for in `month`? */
export function isSavingIn(goal: Goal, month: MonthKey): boolean {
  const { start, end } = goalWindow(goal);
  return month >= start && month <= end;
}

/** What still needs putting aside, spread evenly across the goal's months. */
export function perMonth(goal: Goal): number {
  const outstanding = Math.max(0, goal.targetCost - goal.saved);
  if (outstanding === 0) return 0;
  return outstanding / goalWindow(goal).months;
}

/** What this goal costs in `month` — nothing at all outside its saving window. */
export function monthlyRequired(goal: Goal, month: MonthKey): number {
  return isSavingIn(goal, month) ? perMonth(goal) : 0;
}

/* ---------- The ledger ---------- */

/**
 * The full month summary. Mirrors the `Left (to spend)` row of the original sheet:
 *   base pay + overtime − outgoings − debt payments − savings
 */
export function summarise(state: AppState, month: MonthKey) {
  const basePay = basePayFor(state, month);
  const ot = overtimeFor(state, month);
  const totalIncome = basePay + ot.earnings;

  const totalOutgoings = state.outgoings.reduce((sum, o) => sum + o.amount, 0);
  const totalDebtPayments =
    totalPayments(state.debts, month) + flexTotal(state.flexPayments, month);
  const totalDebt = totalOwed(state.debts, month);
  const totalSavings = state.goals.reduce((sum, g) => sum + monthlyRequired(g, month), 0);

  const committed = totalOutgoings + totalDebtPayments + totalSavings;
  const remaining = totalIncome - committed;

  const rate = ot.rate;
  const shortfall = remaining < 0 ? Math.abs(remaining) : 0;

  return {
    basePay,
    overtimeHours: ot.totalHours,
    overtimeEarnings: ot.earnings,
    rate,
    totalIncome,
    totalOutgoings,
    totalDebtPayments,
    totalDebt,
    totalSavings,
    committed,
    remaining,
    shortfall,
    /** Extra hours needed on top of what's already logged, to get back to zero. */
    hoursToBreakEven: shortfall > 0 && rate > 0 ? shortfall / rate : 0,
    /** Hours that this month's debt payments alone cost you — the sheet's `payment ÷ rate` row. */
    hoursToCoverDebt: rate > 0 ? totalDebtPayments / rate : 0,
    payoff: payoff(state.debts, month),
  };
}
