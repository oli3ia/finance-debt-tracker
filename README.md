# Finance Tracker

A mobile-first PWA for tracking income, outgoings, debts and savings goals in one place.
Everything is worked out live from a single ledger formula, and all data lives in
`localStorage` on the device — nothing is sent anywhere, no account, no backend.

Built with **React 19 + TypeScript + Vite**, installable to the home screen and fully
usable offline.

> New to it? Open **More → Load demo data** to see every tab populated with sample figures,
> then clear it and enter your own. The app starts empty.

## Features

- **Income** — an hourly rate and monthly base pay, plus a day-by-day overtime log that
  feeds the ledger automatically.
- **Outgoings** — recurring costs, sub-totalled both by **bank account** (what to move where)
  and by **category** (where the money goes).
- **Debts** — credit cards and loans with a real draw-down model: a starting balance and a
  payment planned per month, with a projected payoff date. Plus month-scoped **one-off
  payments** for buy-now-pay-later-style costs that vary and have no balance.
- **Goals** — planned purchases and savings targets that spread the cost evenly over an
  explicit start-to-end window.
- **Ledger** — the monthly summary: income minus everything committed, with the **overtime
  hours needed** to close any shortfall.
- **Backup** — export/import the whole state as JSON; reset or clear from the More tab.

## Run it

```bash
npm install
npm run dev -- --host   # --host exposes it to your phone on the same Wi-Fi
```

Vite prints a `Network:` URL — open that on your phone.

## Install it to your phone

```bash
npm run build
npm run preview -- --host
```

Then **Safari → Share → Add to Home Screen**, or **Chrome → ⋮ → Add to Home screen**. It
launches full-screen with no browser chrome and works offline. For a permanent install,
deploy `dist/` to any static host (Netlify, Vercel, GitHub Pages) — it's just static files.

> A service worker needs HTTPS or `localhost`. Over a plain-HTTP LAN address the app still
> works, it just won't install to the home screen or cache offline.

## How it's laid out

| Tab     | What it does                                                        |
| ------- | ------------------------------------------------------------------- |
| Ledger  | The month summary — income minus everything committed               |
| Income  | Hourly rate, base pay, and the day-by-day overtime log              |
| Out     | Outgoings, sub-totalled by bank account **and** by category         |
| Debt    | Balances, a **payment planned per month**, and the running total    |
| Goals   | Planned purchases → what to set aside each month                    |
| More    | Load demo data, export/import a JSON backup, reset                  |

The month selector at the top drives every tab except **Out** — outgoings are treated as
recurring, so they apply to every month.

### Debt: two separate things

The Debt tab holds two lists, because they behave completely differently.

**Cards & loans** — things with a balance. Each has a starting balance (as of a given month)
and a payment planned for each individual month. The entire model is one loop:

```
balance ← starting balance
each month:  charged ← min(planned payment, balance)
             balance ← balance − charged
```

**A payment is never more than what's owed.** That single rule is what makes the arithmetic
add up:

- The payments actually taken always sum to **exactly** the balance — never a penny more.
- The balance can never go negative.
- Once a debt hits £0, nothing is charged after it, whatever the plan still says.
- The last payment shrinks automatically to the remainder (plan £500, owe £96 → charge £96).

Without it, "Repeat £500/mo for two years" on a £3,096 balance would take £11,500 and keep
billing after the debt was gone. If a plan asks for more than the debt is worth, the app
says so and offers **Trim plan to the balance**, which rewrites the stored plan to match:
it drops the payments that fall after payoff and cuts the final one down to what's left.

Raising one month's payment lowers the next month's opening balance and pulls the payoff
date forward. That carry-over is the whole point.

**One-off payments** — buy-now-pay-later instalments and the like, where the amount differs
every month and there's no balance to speak of. Each one **belongs to a single month**,
exactly like an overtime entry. It doesn't exist in any other month until you add one there,
and deleting it only ever affects the month it's in. It has no balance, so it never appears
in "owed" or in the payoff projection — but it's real money out, so it counts in that
month's debt payments and in the Ledger.

**Paid-off cards drop off the list.** A card stays visible in the month you make its final
payment, then vanishes from every month after — it isn't deleted, it moves to a quiet
**Paid off** card at the bottom, and stepping back to a month when it was still owed brings
it back in full.

**Debt-free by** walks the actual plan month by month rather than dividing, because the
payments vary. If the plan runs out with a balance still owing, it says how much is left
unplanned instead of inventing a date.

### Where a debt belongs — does it end?

The deciding question is whether a cost has an end. A car loan at a flat monthly amount and
an open-ended student-loan repayment at the same amount look identical, but they're
opposites: the loan **ends**, so it has a balance and a payoff date; the open-ended one
doesn't, so any payoff date would be fiction. Model the first as a debt; leave the second in
**Outgoings**. Either way the ledger is the same to the penny — it only changes what
"Debts clear by" means.

### Savings goals have a start and an end

A goal saves over an explicit window: a **start month**, then either a number of months or a
last month. Inside that window it costs the same amount every month; outside it, it costs
**nothing**. £810 over 3 months from a September start charges £270 in September, October and
November — £810 exactly — and £0 in every other month, forever. Without the window, a
finished goal would quietly keep draining the ledger.

### The formula

```
Remaining = (base pay + overtime) − (outgoings + debt payments + savings targets)
```

When a month lands in the red, the Ledger leads with **how many hours of overtime cover the
gap** (`shortfall ÷ hourly rate`), split into what's already logged and what's still to go.

### Money out by account

The Ledger's account breakdown covers **outgoings, card and loan payments, and one-offs**, so
the totals are what you actually need to move into each pot this month. Debts and one-offs
each carry a "Paid from" account; anything without one is grouped under **Unassigned**.

## Architecture

```
src/
  types.ts          data model
  store.tsx         single React context: state + actions, persisted to localStorage
  lib/calc.ts       every derived number (the ledger, payoff dates, savings) — pure functions
  lib/format.ts     currency, hours, and month-key helpers
  components/ui.tsx Card, Row, Stat, NumberInput, …
  tabs/             one file per tab
```

Calculations are pure functions in `lib/calc.ts`, deliberately kept out of the components so
the maths stays testable and there's one place to change a formula. State is persisted to
`localStorage` and migrated forward across schema versions on load, so an older saved state
still opens in a newer build.

Back up from the **More** tab before clearing site data or switching device — `localStorage`
is per-browser and per-device.

## Tech stack

- **React 19** + **TypeScript**
- **Vite** build tooling, **vite-plugin-pwa** (autoUpdate service worker, web manifest)
- No runtime dependencies beyond React — the maths, storage and icons are all hand-rolled
- Icons generated from pure pixel math, no image toolchain:

  ```bash
  node scripts/make-icons.mjs
  ```
