# Supabase setup — bringing the backend online

The Next.js app in `web-next/` is fully scaffolded but **not connected to a live
backend**. This document lists everything you need to do to wire it up. Nothing
here has been run against a real project yet.

## 1. Environment variables

Copy `.env.local.example` to `.env.local` and fill in these three values from
**Supabase → Project Settings → API**:

| Variable | Where to find it | Exposed to browser? | Used by |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Yes | browser + server clients, middleware |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key | Yes (RLS protects data) | browser + server clients, middleware |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key | **No — server only** | `app/api/delete-account/route.js` |

For deployment on Vercel, add the same three variables under
**Project → Settings → Environment Variables** (mark the service-role key as not
exposed to the browser — it is only read in server code).

> Until these are set, the app still builds and runs: middleware and auth
> short-circuit ("not configured" mode), public pages render, and protected
> pages show their loading/empty states.

## 2. Create the Supabase project

1. Create a new project at https://supabase.com.
2. Grab the URL + keys from Project Settings → API and put them in `.env.local`.

## 3. Run the database migrations

In the Supabase dashboard, open **SQL Editor** and run, in order:

1. `supabase/migrations/0001_init.sql` — tables, seed houses, seed `app_config`.
2. `supabase/migrations/0002_rls.sql` — role helpers, the `handle_new_user`
   trigger (auto-creates a `profiles` row on signup), and all RLS policies.
3. `supabase/migrations/0003_registration_number.sql` through
   `0005_sports_age_range.sql` — incremental schema tweaks.
4. `supabase/migrations/0006_open_role_access.sql` — opens registrations,
   staff_registrations, sports, results, injuries, and decisions up to any
   signed-in role (not just staff/admin).

(Or, with the Supabase CLI: `supabase link` then `supabase db push`.)

**Review the RLS policies** before relying on them. As of `0006`, any signed-in
user (`user`, `staff`, or `admin`) can read and write registrations, staff
registrations, sports, results, injuries, and decisions (`createdBy`/
`recordedBy` are still forced to the caller). Only `profiles` (role
management), `houses`, and `app_config` stay admin-write-only — those back the
admin-only `/admin`, `/admin/registrations`, and `/admin/settings` routes.

### Column naming note
Domain columns are intentionally **camelCase** (e.g. `"houseKey"`,
`"attendingThisFiesta"`, `"personId"`) to match the React field names and keep
the CRA→Next port low-risk. Only audit columns are snake_case (`created_at`,
`created_by`…). This is a deliberate trade-off; a later pass can normalize to
snake_case with a mapping layer.

## 4. Create the Storage bucket

Profile pictures use a bucket named **`profile-pictures`**:

1. Storage → New bucket → name it `profile-pictures`.
2. Make it **public** (the app stores public URLs), or keep it private and switch
   `getPublicUrl` to signed URLs in `utils/storageHelpers.js`.
3. Add Storage RLS policies so a user can write only under their own
   `"{userId}/"` prefix (mirrors the old Firebase Storage rules).

## 5. Bootstrap your first admin

Signups get the `user` role by default. To make yourself an admin, sign up in the
app, then run in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Roles used by the app: `user`, `staff`, `admin`.

## 6. Auth settings

- Email/password auth is used (`signInWithPassword` / `signUp`).
- If you disable "Confirm email" in Auth settings, signups can log in
  immediately; otherwise users must confirm first.
- The profile helpers in `contexts/AuthContext.jsx` for email/password changes
  map to `supabase.auth.updateUser(...)`; email changes follow Supabase's
  confirization flow, which differs slightly from Firebase.

## 7. Run it

```bash
cd web-next
npm install
npm run dev     # http://localhost:3000
```

## Still TODO by you (summary checklist)
- [ ] Fill `.env.local` (3 vars) and Vercel env vars.
- [ ] Create the Supabase project.
- [ ] Run `0001_init.sql` then `0002_rls.sql`; review RLS.
- [ ] Create the `profile-pictures` Storage bucket (+ policies).
- [ ] Promote your account to `admin`.
- [ ] Verify email-confirmation settings.
