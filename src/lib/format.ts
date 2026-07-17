import type { MonthKey } from '../types';

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function money(n: number): string {
  return gbp.format(Number.isFinite(n) ? n : 0);
}

/** Signed money, always showing + or −, for ledger rows. */
export function signedMoney(n: number): string {
  const sign = n < 0 ? '−' : '+';
  return `${sign}${money(Math.abs(n)).replace('-', '')}`;
}

export function hours(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `${rounded}h`;
}

export function monthKey(d: Date): MonthKey {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonthKey(): MonthKey {
  return monthKey(new Date());
}

export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

/** Whole months from `from` up to `to`. Negative if `to` is in the past. */
export function monthsBetween(from: MonthKey, to: MonthKey): number {
  const [fy, fm] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function monthKeyOf(isoDate: string): MonthKey {
  return isoDate.slice(0, 7);
}

/** First and last day of a month, as ISO dates — used to clamp the date picker. */
export function monthBounds(key: MonthKey): { min: string; max: string } {
  const [y, m] = key.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { min: `${key}-01`, max: `${key}-${String(last).padStart(2, '0')}` };
}

export function dayLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
