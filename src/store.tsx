import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AppState,
  Debt,
  FlexPayment,
  Goal,
  MonthKey,
  MonthOverride,
  Outgoing,
  OvertimeEntry,
} from './types';
import { currentMonthKey, shiftMonth, monthsBetween } from './lib/format';

const STORAGE_KEY = 'pay-debt-calc:v1';
const SCHEMA_VERSION = 5;

const uid = () => Math.random().toString(36).slice(2, 10);

/** Spreads a run of monthly payments out from `from`, dropping the zero months. */
function planFrom(from: MonthKey, amounts: number[]): Record<MonthKey, number> {
  const plan: Record<MonthKey, number> = {};
  amounts.forEach((amount, i) => {
    if (amount > 0) plan[shiftMonth(from, i)] = amount;
  });
  return plan;
}

/** A blank slate: what a first-time user opens, and what "Clear all data" restores. */
function emptyState(): AppState {
  return {
    version: SCHEMA_VERSION,
    hourlyRate: 0,
    basePay: 0,
    overtime: [],
    outgoings: [],
    debts: [],
    flexPayments: [],
    goals: [],
    monthOverrides: {},
  };
}

/**
 * Illustrative demo data — entirely made-up, generic figures — so the app can be seen
 * fully populated in a single tap without anyone entering their own numbers. Everything
 * is anchored to the current month, so the demo always looks current. Loaded on demand
 * from More → Load demo data; it is never seeded automatically.
 */
function sampleState(): AppState {
  const now = currentMonthKey();
  const o = (
    category: string,
    name: string,
    amount: number,
    account: string,
  ): Outgoing => ({ id: uid(), category, name, amount, account });

  return {
    version: SCHEMA_VERSION,
    hourlyRate: 12,
    basePay: 1600,
    overtime: [],
    outgoings: [
      o('Housing', 'Rent', 650, 'Main Account'),
      o('Housing', 'Council Tax', 90, 'Main Account'),
      o('Bills', 'Energy', 80, 'Main Account'),
      o('Bills', 'Phone', 20, 'Main Account'),
      o('Bills', 'Broadband', 28, 'Main Account'),
      o('Subscriptions', 'Streaming', 15, 'Spending Account'),
      o('Subscriptions', 'Gym', 30, 'Spending Account'),
      o('Living', 'Groceries', 220, 'Spending Account'),
      o('Living', 'Fuel', 60, 'Spending Account'),
    ],
    // Each debt's payments sum to exactly its balance, so the plan clears it to zero.
    debts: [
      {
        id: uid(),
        name: 'Credit Card',
        startBalance: 1200,
        startMonth: now,
        payments: planFrom(now, [200, 200, 200, 200, 200, 200]),
        account: 'Main Account',
      },
      {
        id: uid(),
        name: 'Car Loan',
        startBalance: 3000,
        startMonth: now,
        payments: planFrom(now, Array<number>(12).fill(250)),
        account: 'Main Account',
      },
      {
        id: uid(),
        name: 'Overdraft',
        startBalance: 500,
        startMonth: now,
        payments: planFrom(now, [100, 100, 100, 100, 100]),
        account: 'Spending Account',
      },
    ],
    // One-off instalments that vary month to month, each living only in its own month.
    flexPayments: [
      { id: uid(), name: 'Buy Now Pay Later', month: now, amount: 75, account: 'Spending Account' },
      {
        id: uid(),
        name: 'Buy Now Pay Later',
        month: shiftMonth(now, 1),
        amount: 50,
        account: 'Spending Account',
      },
    ],
    goals: [
      {
        id: uid(),
        name: 'Holiday',
        targetCost: 900,
        saved: 150,
        startMonth: now,
        mode: 'months',
        targetMonth: shiftMonth(now, 5),
        months: 6,
      },
      {
        id: uid(),
        name: 'New Laptop',
        targetCost: 1000,
        saved: 0,
        startMonth: shiftMonth(now, 2),
        mode: 'months',
        targetMonth: shiftMonth(now, 6),
        months: 5,
      },
    ],
    monthOverrides: {},
  };
}

/**
 * Older shapes this has to read back:
 *   v1 — one flat `monthlyPayment` per debt.
 *   v2 — a payment per month, no debt types.
 *   v3 — `tracksBalance: false` marked a debt as payment-only.
 */
interface LegacyDebt {
  id: string;
  name: string;
  balance?: number;
  monthlyPayment?: number;
  tracksBalance?: boolean;
  startBalance?: number;
  startMonth?: MonthKey;
  payments?: Record<MonthKey, number>;
  account?: string;
}

function migrate(
  debts: LegacyDebt[],
  flex: FlexPayment[],
  from: MonthKey,
): { debts: Debt[]; flexPayments: FlexPayment[] } {
  const out: Debt[] = [];
  const carried: FlexPayment[] = [...flex];

  for (const d of debts) {
    // v3 payment-only debts become one standalone entry per month they had a
    // payment in. Nothing is lost, and the months stop being tied together.
    if (d.tracksBalance === false) {
      for (const [month, amount] of Object.entries(d.payments ?? {})) {
        if (amount > 0) {
          carried.push({ id: uid(), name: d.name, month, amount, account: d.account ?? '' });
        }
      }
      continue;
    }

    if (d.payments) {
      out.push({
        id: d.id,
        name: d.name,
        startBalance: d.startBalance ?? 0,
        startMonth: d.startMonth ?? from,
        payments: d.payments,
        account: d.account ?? '',
      });
      continue;
    }

    // v1: roll the old flat payment forward until it clears the balance, which is
    // exactly what v1 was assuming — now visible and editable month by month.
    const balance = d.balance ?? 0;
    const monthly = d.monthlyPayment ?? 0;
    const count = monthly > 0 ? Math.ceil(balance / monthly) : 0;
    const payments: Record<MonthKey, number> = {};
    let left = balance;
    for (let i = 0; i < count; i++) {
      payments[shiftMonth(from, i)] = Math.min(monthly, left);
      left -= monthly;
    }
    out.push({
      id: d.id,
      name: d.name,
      startBalance: balance,
      startMonth: from,
      payments,
      account: d.account ?? '',
    });
  }

  return { debts: out, flexPayments: carried };
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<AppState> & { debts?: LegacyDebt[] };
    const base = emptyState();
    const migrated = migrate(
      parsed.debts ?? [],
      parsed.flexPayments ?? [],
      currentMonthKey(),
    );
    // Merge against a blank base so a state saved by an older build is still usable.
    return {
      ...base,
      ...parsed,
      version: SCHEMA_VERSION,
      overtime: parsed.overtime ?? [],
      outgoings: parsed.outgoings ?? [],
      debts: migrated.debts,
      flexPayments: migrated.flexPayments.map((f) => ({ ...f, account: f.account ?? '' })),
      // Goals predating `startMonth` were saved for from whenever you looked at them.
      // Anchor them to this month so they run a fixed span from here.
      goals: (parsed.goals ?? []).map((g) => ({
        ...g,
        startMonth: g.startMonth ?? currentMonthKey(),
      })),
      monthOverrides: parsed.monthOverrides ?? {},
    };
  } catch {
    return emptyState();
  }
}

interface Store {
  state: AppState;
  month: MonthKey;
  setMonth: (m: MonthKey) => void;
  stepMonth: (delta: number) => void;

  setRate: (rate: number) => void;
  setBasePay: (pay: number) => void;
  setMonthOverride: (month: MonthKey, patch: MonthOverride) => void;

  addOutgoing: () => void;
  updateOutgoing: (id: string, patch: Partial<Outgoing>) => void;
  removeOutgoing: (id: string) => void;

  addDebt: () => void;
  updateDebt: (id: string, patch: Partial<Debt>) => void;
  setDebtPayment: (id: string, month: MonthKey, amount: number) => void;
  /** Writes the same payment into every month from `from` to `to` inclusive. */
  repeatDebtPayment: (id: string, from: MonthKey, to: MonthKey, amount: number) => void;
  /** Cuts the plan back so the payments add up to exactly the balance, no more. */
  trimDebtPlan: (id: string) => void;
  removeDebt: (id: string) => void;

  addFlexPayment: (month: MonthKey) => void;
  updateFlexPayment: (id: string, patch: Partial<FlexPayment>) => void;
  removeFlexPayment: (id: string) => void;

  addGoal: () => void;
  updateGoal: (id: string, patch: Partial<Goal>) => void;
  removeGoal: (id: string) => void;

  addOvertime: (date: string, hours: number) => void;
  updateOvertime: (id: string, patch: Partial<OvertimeEntry>) => void;
  removeOvertime: (id: string) => void;

  replaceAll: (next: AppState) => void;
  /** Loads the illustrative demo dataset, for a first look without typing anything in. */
  loadSample: () => void;
  clearAll: () => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [month, setMonth] = useState<MonthKey>(currentMonthKey);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Quota or private-mode failure — the app still works for this session.
    }
  }, [state]);

  const patchList = useCallback(
    <K extends 'outgoings' | 'debts' | 'goals' | 'overtime' | 'flexPayments'>(
      key: K,
      id: string,
      patch: Partial<AppState[K][number]>,
    ) => {
      setState((s) => ({
        ...s,
        [key]: (s[key] as AppState[K][number][]).map((item) =>
          item.id === id ? { ...item, ...patch } : item,
        ),
      }));
    },
    [],
  );

  const removeFrom = useCallback(
    (key: 'outgoings' | 'debts' | 'goals' | 'overtime' | 'flexPayments', id: string) => {
      setState((s) => ({
        ...s,
        [key]: (s[key] as { id: string }[]).filter((item) => item.id !== id),
      }));
    },
    [],
  );

  const store = useMemo<Store>(
    () => ({
      state,
      month,
      setMonth,
      stepMonth: (delta) => setMonth((m) => shiftMonth(m, delta)),

      setRate: (hourlyRate) => setState((s) => ({ ...s, hourlyRate })),
      setBasePay: (basePay) => setState((s) => ({ ...s, basePay })),
      setMonthOverride: (m, patch) =>
        setState((s) => {
          const next = { ...(s.monthOverrides[m] ?? {}), ...patch };
          // Drop keys that were cleared, so the month falls back to the global default.
          for (const k of Object.keys(next) as (keyof MonthOverride)[]) {
            if (next[k] === undefined) delete next[k];
          }
          return { ...s, monthOverrides: { ...s.monthOverrides, [m]: next } };
        }),

      addOutgoing: () =>
        setState((s) => ({
          ...s,
          outgoings: [
            ...s.outgoings,
            { id: uid(), name: '', amount: 0, account: '', category: '' },
          ],
        })),
      updateOutgoing: (id, patch) => patchList('outgoings', id, patch),
      removeOutgoing: (id) => removeFrom('outgoings', id),

      addDebt: () =>
        setState((s) => ({
          ...s,
          debts: [
            ...s.debts,
            {
              id: uid(),
              name: '',
              startBalance: 0,
              startMonth: month,
              payments: {},
              account: '',
            },
          ],
        })),
      updateDebt: (id, patch) => patchList('debts', id, patch),
      setDebtPayment: (id, m, amount) =>
        setState((s) => ({
          ...s,
          debts: s.debts.map((d) => {
            if (d.id !== id) return d;
            const payments = { ...d.payments };
            // Drop the key entirely at zero, so "no payment planned" and "£0
            // planned" don't drift apart in the schedule.
            if (amount > 0) payments[m] = amount;
            else delete payments[m];
            return { ...d, payments };
          }),
        })),
      repeatDebtPayment: (id, from, to, amount) =>
        setState((s) => ({
          ...s,
          debts: s.debts.map((d) => {
            if (d.id !== id || amount <= 0) return d;
            const span = monthsBetween(from, to);
            if (span < 0) return d;
            const payments = { ...d.payments };
            // Capped so a mistyped year can't write tens of thousands of entries.
            for (let i = 0; i <= Math.min(span, 600); i++) {
              payments[shiftMonth(from, i)] = amount;
            }
            return { ...d, payments };
          }),
        })),
      trimDebtPlan: (id) =>
        setState((s) => ({
          ...s,
          debts: s.debts.map((d) => {
            if (d.id !== id) return d;
            const payments: Record<MonthKey, number> = {};
            let left = d.startBalance;
            for (const m of Object.keys(d.payments).sort()) {
              if (m < d.startMonth || left <= 0.005) continue;
              // The last payment shrinks to whatever is actually left owing.
              const take = Math.min(d.payments[m], left);
              if (take > 0) payments[m] = take;
              left -= take;
            }
            return { ...d, payments };
          }),
        })),
      removeDebt: (id) => removeFrom('debts', id),

      // Belongs to one month only. Deleting it touches nothing else.
      addFlexPayment: (m) =>
        setState((s) => ({
          ...s,
          flexPayments: [
            ...s.flexPayments,
            { id: uid(), name: '', month: m, amount: 0, account: '' },
          ],
        })),
      updateFlexPayment: (id, patch) => patchList('flexPayments', id, patch),
      removeFlexPayment: (id) => removeFrom('flexPayments', id),

      addGoal: () =>
        setState((s) => ({
          ...s,
          goals: [
            ...s.goals,
            {
              id: uid(),
              name: '',
              targetCost: 0,
              saved: 0,
              startMonth: month,
              mode: 'date',
              // +5 months, not +6: the target month is inclusive, so this is a
              // 6-month runway — matching `months` and keeping the two modes
              // in agreement when the user toggles between them.
              targetMonth: shiftMonth(month, 5),
              months: 6,
            },
          ],
        })),
      updateGoal: (id, patch) => patchList('goals', id, patch),
      removeGoal: (id) => removeFrom('goals', id),

      addOvertime: (date, hours) =>
        setState((s) => ({
          ...s,
          overtime: [...s.overtime, { id: uid(), date, hours }],
        })),
      updateOvertime: (id, patch) => patchList('overtime', id, patch),
      removeOvertime: (id) => removeFrom('overtime', id),

      replaceAll: (next) => setState({ ...next, version: SCHEMA_VERSION }),
      loadSample: () => setState(sampleState()),
      clearAll: () => setState(emptyState()),
    }),
    [state, month, patchList, removeFrom],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
}
