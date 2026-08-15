# house-reg — Next.js + Supabase (migration)

This is the **Next.js (App Router) + Supabase** migration of the original
Create-React-App + Firebase `house-reg` app. The original CRA app still lives in
the repo root (`../src`) and is untouched, so you can run and compare both. This
migration lives entirely under `web-next/` and is on the `nextjs-supabase-migration`
git branch.

**The backend is not connected yet** — it uses placeholder env vars. See
[`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for exactly what to fill in and run.

## Stack & decisions
- **Next.js 15** App Router, **plain JS/JSX** (matches the original; no TS).
- **Supabase** for Auth + Postgres + Storage (`@supabase/supabase-js`, `@supabase/ssr`).
- Tailwind CSS, Chart.js/Recharts, Framer Motion, react-csv — same as before.
- **Auth guard split**: `middleware.js` refreshes the session and redirects
  signed-out users off protected routes; per-route **role** checks use the client
  `<RoleGuard>` in the `(admin)` / `(staff)` / `(member)` route-group layouts.
  RLS is the real server-side boundary.
- **Client-first port**: pages that were `useEffect`-driven in CRA stay Client
  Components. This preserves parity and keeps `next build` free of build-time
  data fetching before credentials exist. Moving pages to server-side data
  fetching / SSR is a deliberate follow-up, not this pass.
- **Column naming**: domain columns are camelCase to match the app's field names
  (e.g. `"houseKey"`, `"attendingThisFiesta"`); only audit columns are snake_case
  (`created_at`, `created_by`…). See `supabase/migrations/0001_init.sql`.

## Layout
```
web-next/
  app/
    layout.jsx            # root shell: Providers + Header/Footer, no-flash theme
    page.jsx              # / (public Welcome)
    login/ signup/        # public auth pages
    (admin)/  (staff)/  (member)/   # role-group layouts wrap RoleGuard
    api/delete-account/route.js     # replaces the Firebase Cloud Function
  components/  contexts/  hooks/  utils/
  lib/supabase/{client,server,middleware,admin,config}.js
  middleware.js
  supabase/migrations/{0001_init.sql, 0002_rls.sql}
  SUPABASE_SETUP.md  .env.local.example
```

## Run
```bash
cd web-next
npm install
npm run dev     # http://localhost:3000
```
Builds and runs with placeholder env vars (auth/data are inert until you follow
`SUPABASE_SETUP.md`).

## Port status
**Every route from the original `App.js` is ported and wired** (24 routes build):
`/` Welcome, `/login`, `/signup`, `/register` (house assignment), `/staff-registration`,
`/admin`, `/admin/registrations`, `/admin/staff`, `/admin/program-metrics`,
`/admin/settings`, `/admin/sports`, `/results`, `/injuries`, `/decisions`,
`/dashboard`, `/analysis`, `/staff-dashboard`, `/metrics-dashboard`,
`/program-metrics`, `/profile`, and `POST /api/delete-account` — plus all shared
components, contexts, hooks, utils, the Supabase client layer, SQL schema + RLS,
and the delete-account route handler.

**Intentionally not wired:** `src/pages/AdditionalMetricsForm.jsx` was orphaned in
the original CRA app (no route or nav link in `App.js`), so it was not migrated. If
you want it, it maps cleanly to a `/metrics-form` route writing to `program_metrics`.

Translation recipe applied throughout: `firebase/firestore` → `supabase.from(...)`,
`onSnapshot` → fetch + realtime channel, `"use client"` on interactive pages,
`react-router-dom` → `next/navigation`/`next/link`, `serverTimestamp()` → DB default,
`createdAt.toDate()`/`.seconds` → `new Date(row.created_at)`.
