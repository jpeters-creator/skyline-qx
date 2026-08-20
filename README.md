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

## What's in

- Auth + shop bootstrap / seed
- Board, jobs, estimate lines, bid math
- Price book (catalog) and customers
- Settings (labor, OH, profit, waste, tax)
- AI draft takeoff
- Official Skyline lockup
- Shop finishes: **Mill night**, **Galvalume**, **Brake shop** (header toggle, saved locally)

## For the next person

Good next cuts:

1. Wire a real Postgres (`DATABASE_URL`) and deploy (Vercel / Nitro output is already in `vite.config.ts`).
2. Confirm bid print / PDF export.
3. Tighten catalog units (SF, LF, EA, HR) and waste defaults per shop.
4. Job statuses + pipeline filters against real estimating workflow.
5. Invite-only shop accounts (right now any signed-in user gets a book).

Brand tokens live in `src/styles.css` (`data-theme="mill|galvalume|brake"`). Logo assets: `public/skyline-mark.png`, `public/skyline-lockup.png`, `public/skyline-lockup-light.png`.

## License

Private — Skyline Sheet Metal internal use.
