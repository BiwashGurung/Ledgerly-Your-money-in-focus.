# Ledgerly

A private, browser-only personal finance tracker built with React, TypeScript, and Vite. Ledgerly uses no backend, API, sign-in, external font service, or paid service. Transactions, monthly budgets, and preferences are stored in a versioned `localStorage` record.

## Development

Requires Node.js 20.19+ or 22.12+.

```sh
pnpm install
pnpm dev
```

## Quality checks

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production files are written to `dist/`.

## Static deployment

Run `npm run build` and publish the contents of `dist/` to any static host. No server runtime, environment variables, database, or secrets are required. Configure the host to serve `index.html` for the site root. Ledgerly currently uses client-side view state rather than separate URL routes, so no special route fallback is needed.

## Money and dates

- Amounts are stored as integer minor units with two decimal places. Currency changes alter display formatting only; no exchange rates or conversions are applied.
- The default currency is NPR. Supported display currencies are NPR, USD, GBP, EUR, INR, and AUD.
- Current balance is lifetime income minus lifetime expenses across every saved transaction.
- Month cards, reports, and budgets use the selected calendar month. Budgets count expense transactions only. A savings rate is net monthly cash flow divided by income when income is greater than zero.
- Dates are saved as local `YYYY-MM-DD` calendar dates, so date inputs and month boundaries do not shift with UTC conversion.

## Your data

All data stays in this browser and is not encrypted. `localStorage` is specific to a browser profile and website origin; it does not sync between browsers or devices and can be lost if site data is cleared. Export a versioned JSON backup regularly if you need a portable copy. Settings can also export transactions as CSV and import a validated JSON backup by merging new records or explicitly replacing current data.

The store validates its version and schema at startup. Older supported records are migrated, while corrupt records, unsupported newer versions, and failed writes are surfaced instead of being silently replaced. Browser storage may be disabled or run out of space; in that case, Ledgerly reports that persistence failed.
