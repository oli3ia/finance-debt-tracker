/** A month key in `YYYY-MM` form, e.g. "2026-07". */
export type MonthKey = string;

export interface Outgoing {
  id: string;
  name: string;
  amount: number;
  /** Destination bank account / card the money leaves from. */
  account: string;
  /** Optional grouping, e.g. "Car", "Subscriptions". */
  category: string;
}

/** A card or loan: `startBalance` is drawn down by each payment made against it. */
export interface Debt {
  id: string;
  name: string;
  /** What was owed as of `startMonth`, before any of the planned payments below. */
  startBalance: number;
  startMonth: MonthKey;
  /** Planned payment per month. Months vary, so each is logged individually. */
  payments: Record<MonthKey, number>;
  /** Which account the payment leaves from, so the by-account totals stay complete. */
  account: string;
}

/**
 * A standalone payment in a single month — a buy-now-pay-later instalment and the
 * like, where the amount differs every month and there's no balance behind it.
 *
 * It lives in exactly one month, the same way an overtime entry does. It doesn't
 * exist in any other month until you add one there, and deleting it only ever
 * affects the month it's in.
 */
export interface FlexPayment {
  id: string;
  name: string;
  month: MonthKey;
  amount: number;
  account: string;
}

export interface Goal {
  id: string;
  name: string;
  targetCost: number;
  saved: number;
  /** The first month you set money aside. Nothing is deducted before it. */
  startMonth: MonthKey;
  /** `date` runs from startMonth to targetMonth; `months` runs for `months` from startMonth. */
  mode: 'date' | 'months';
  targetMonth: MonthKey;
  months: number;
}

export interface OvertimeEntry {
  id: string;
  /** ISO `YYYY-MM-DD`. The month it belongs to is derived from this. */
  date: string;
  hours: number;
}

/** Per-month overrides. A blank/undefined field falls back to the global default. */
export interface MonthOverride {
  basePay?: number;
  hourlyRate?: number;
}

export interface AppState {
  version: number;
  /** Global default hourly rate, overridable per month. */
  hourlyRate: number;
  /** Global default monthly take-home pay, overridable per month. */
  basePay: number;
  overtime: OvertimeEntry[];
  outgoings: Outgoing[];
  debts: Debt[];
  flexPayments: FlexPayment[];
  goals: Goal[];
  monthOverrides: Record<MonthKey, MonthOverride>;
}
