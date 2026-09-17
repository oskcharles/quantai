# CopyFlow

A trade-copying platform: connect a master trading account, add follower
accounts, and mirror trades between them with per-follower risk controls.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind, Prisma (SQLite
schema), NextAuth (credentials), deployed to Cloudflare Workers via OpenNext.

## Local development

```bash
npm install
npm run db:migrate   # creates/updates dev.db (SQLite) from prisma/schema.prisma
npm run dev
```

Open http://localhost:3000. `.env` already points `DATABASE_URL` at a local
`dev.db` file and sets a dev-only `AUTH_SECRET` — replace both for anything
beyond local testing.

The dashboard lets you add PAPER (simulated) master/follower accounts, link
them with a risk multiplier, open a trade on the master, and run the copy
engine to mirror it onto followers. MT4/MT5/cTrader connections can be
created but will report a clear "not implemented" error when you try to
trade on them — see `src/lib/brokers/` to add a real adapter.

## Deploying to Cloudflare

The app runs on Cloudflare Workers via
[OpenNext](https://opennext.js.org/cloudflare), Cloudflare's recommended
adapter for Next.js. Because Workers have no filesystem, production uses
**Cloudflare D1** (SQLite-compatible) instead of the local `dev.db` file —
same Prisma schema, different driver adapter (see `src/lib/db.ts`).

### 1. Create the D1 database

```bash
npx wrangler login
npx wrangler d1 create copyflow-db
```

Copy the `database_id` it prints into `wrangler.jsonc` (replace
`REPLACE_WITH_YOUR_D1_DATABASE_ID`).

### 2. Apply the schema to D1

```bash
npx wrangler d1 execute copyflow-db --remote --file=prisma/migrations/<latest-folder>/migration.sql
```

(Run this again after any future `npm run db:migrate` that adds a new
migration folder.)

### 3. Connect the repo in the Cloudflare dashboard

In the Cloudflare dashboard: **Workers & Pages → Create → Workers → Import
a Git repository**, pick this repo/branch, and set:

- Build command: `npm run cf:build`
- Deploy command: `npx wrangler deploy`
- Environment variable `AUTH_SECRET`: generate one with `openssl rand -base64 32`
  and set it as a **secret** (not a plaintext var).

Cloudflare will pick up the `d1_databases` binding from `wrangler.jsonc`
automatically. Every push to the connected branch redeploys.

### 4. Deploying manually instead (optional)

If you'd rather deploy from your own machine instead of Git integration:

```bash
npx wrangler secret put AUTH_SECRET
npm run cf:deploy
```

## Project structure

- `src/lib/brokers/` — the `BrokerAdapter` interface plus the working
  `PaperBrokerAdapter` (simulated fills). Add `mt5.ts` / `ctrader.ts` etc.
  here to support real broker platforms; nothing else needs to change.
- `src/lib/copy-engine.ts` — mirrors open trades from master to follower
  accounts per `CopyLink` (risk multiplier, max lot size, reverse copy,
  symbol whitelist), and closes copies when the source trade closes.
- `src/lib/db.ts` — resolves a `PrismaClient` against local SQLite (dev) or
  Cloudflare D1 (production), since Workers only expose bindings per-request.
- `src/app/dashboard/` — the trading dashboard (connections, copy links,
  trades, "run copy engine now").
