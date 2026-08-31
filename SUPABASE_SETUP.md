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
   signed-in role (not just staff/admin) for reads and for creating their own
   records; editing/deleting is limited to records the caller created (or any
   record, for admins).
5. `supabase/migrations/0007_staff_house_assignment.sql` — adds house-assignment
   columns to staff_registrations (later reversed by `0008`, then narrowed back
   to Marshals only by `0009` — see below).
6. `supabase/migrations/0008_fiesta_enhancements.sql` — marshal/counsellor
   roles, `event_representatives`, and an RLS overhaul gating writes on the
   caller's role.
7. `supabase/migrations/0009_atomic_house_assignment.sql` — moves the balanced
   min-count/random-tiebreak house pick into Postgres
   (`public.pick_balanced_house()`), called atomically (under an advisory
   lock) by both `public.register_participant()` and `public.register_staff()`
   so two simultaneous registrations can never land on the same "currently
   lowest" house. Marshals are assigned a house through this path too, drawn
   from the same combined, real-time count as participants.
8. `supabase/migrations/0010_fixed_sports_catalog.sql` — replaces whatever is
   in `public.sports` with the fixed Sports Fiesta 5.0 catalog (33 events:
   Team Sports, Track & Field, Fun & Field Games, Mind & Social Games), and
   adds `"eventGroup"`, `"sortOrder"`, and `"medalEligible"` columns (the
   three Mind & Social Games are `medalEligible = false`). **This deletes any
   existing rows in `public.sports`** — see the comment at the top of that
   file for exactly what that does (and doesn't) affect in `results` and
   `event_representatives`. There is no longer an "Add activity" flow in the
   app; the catalog is only changed by editing this migration.
9. `supabase/migrations/0011_all_staff_house_assignment.sql` — expands house
   assignment from Marshal-only to every staff designation, by replacing
   `public.register_staff()`'s eligibility check (same function, same
   `public.pick_balanced_house()` algorithm — only the gate changes).
10. `supabase/migrations/0012_participant_house_age_range.sql` — participant
    house-assignment eligibility changes from ages 5-20 to 9-and-up (no upper
    bound), replacing the `registrations_house_age_check` constraint added by
    `0008`. The matching client-side check is in
    `app/(member)/register/page.jsx`'s `completeRegistration`.
11. `supabase/migrations/0013_house_scoped_representatives.sql` — adds
    `public.current_staff_house_key()` (resolves the caller's own house from
    their `staff_registrations` row) and tightens `event_representatives`
    insert/delete RLS so Marshals/Counsellors can only select/remove
    representatives for their own house (Admins stay unrestricted); also
    extends that access from Marshal-only to Marshal + Counsellor.
12. `supabase/migrations/0014_add_church_field.sql` — adds a `church` text
    column to `public.registrations` and a matching `p_church` parameter on
    `public.register_participant()`. The Participant registration form's
    Church dropdown (options admin-managed via `app_config.settings.churches`,
    edited on `/admin/settings`) resolves an "Other" selection down to the
    typed value client-side before calling the RPC, so this one column always
    holds the final name either way.
13. `supabase/migrations/0015_house_only_results.sql` — simplifies result
    recording to house-only: drops the `validate_result_representative`
    trigger/function and relaxes `results_insert_marshal` so a result no
    longer has to reference a specific representative. `results.personId` /
    `personName` / `representativeId` stay on the table (nullable) so old
    rows keep their data; new rows just leave them null. Representative
    selection itself (`public.event_representatives`) is untouched.
14. `supabase/migrations/0016_seed_churches.sql` — seeds
    `app_config.settings.churches` with the known church list, but only when
    it's still unset/empty, so it never overwrites an admin's edits made on
    `/admin/settings`.
15. `supabase/migrations/0017_staff_full_operational_access.sql` — widens
    `is_marshal_or_admin()`/`is_counsellor_or_admin()` to also admit the
    `staff` role, so Staff get the full operational toolkit (results,
    injuries, decisions, representative selection) alongside Marshals and
    Counsellors. Sports-catalog management stays admin-only.

(Or, with the Supabase CLI: `supabase link` then `supabase db push`.)

**Review the RLS policies** before relying on them. As of `0006`, any signed-in
user (`user`, `staff`, or `admin`) can read all registrations, staff
registrations, sports, results, injuries, and decisions, and create their own;
updating/deleting a record requires being its creator (`createdBy`/
`recordedBy`/`submittedByUid`, forced to the caller's own uid via a column
default) or being an admin. Only `profiles` (role management), `houses`, and
`app_config` stay admin-write-only — those back the admin-only `/admin`,
`/admin/registrations`, and `/admin/settings` routes.

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
