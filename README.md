# Skyline QX

Job estimating for **Skyline Sheet Metal** — takeoffs, price book, customers, and bid pipeline. Same shop chrome as Skyline CIC, darker mill finishes so the two apps are obvious across screens.

## Stack

- TanStack Start + React
- Tailwind v4
- PGLite locally, Postgres (`DATABASE_URL`) when deployed
- Better Auth (Google / X; email-password optional)
- xAI for AI draft takeoff (`XAI_API_KEY`)

## Run locally

```bash
git clone https://github.com/jpeters-creator/skyline-qx.git
cd skyline-qx
npm install
cp .env.example .env
npm run dev
```

App: [http://localhost:8080](http://localhost:8080)

```bash
npm run typecheck
npm run build
npm run preview   # production preview on 8081
```

### Real Postgres

Set `DATABASE_URL` to a Neon / RDS / local Postgres URL. Migrations in `migrations/` apply on `npm run build` (via `scripts/migrate.mjs`) and on PGLite startup. No code changes required — `src/lib/db.ts` already switches backends.

```bash
# .env
DATABASE_URL=postgres://user:pass@host:5432/skyline_qx
```

## What's in

- Auth + shop bootstrap / seed
- Board, jobs, estimate lines, bid math
- Price book (catalog) and customers
- Settings (labor, OH, profit, waste, tax)
- AI draft takeoff
- Official Skyline lockup
- Shop finishes: **Mill night**, **Galvalume**, **Brake shop** (header toggle, saved locally)
- Pipeline status filters (open / awarded / closed buckets)
- Print-ready bid sheet (`window.print` on job detail)
- Unit-aware waste defaults (SF/LF/EA/HR)
- Invite-only shop members (`shop_members` table; empty = open bootstrap)

## For the next person

Good next cuts:

1. ~~Wire a real Postgres (`DATABASE_URL`)~~ — done; set env and deploy.
2. Client-side PDF download (jsPDF / print-to-PDF is already solid via Print).
3. Admin UI to invite shop members by email.
4. Bid history / revision snapshots.
5. Customer portal share link (read-only bid).

Brand tokens live in `src/styles.css` (`data-theme="mill|galvalume|brake"`). Logo assets: `public/skyline-mark.png`, `public/skyline-lockup.png`, `public/skyline-lockup-light.png`.

## License

Private — Skyline Sheet Metal internal use.
