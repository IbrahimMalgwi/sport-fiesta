-- =============================================================================
-- 0006_open_role_access.sql — open the Fiesta operational modules up to every
-- signed-in role, not just staff/admin — for OWN records only.
--
-- Previously `registrations`/`staff_registrations` were admin-write-only and
-- `sports`/`results`/`injuries`/`decisions` required staff/admin. The app is
-- moving to a model where any registered user (role 'user', 'staff', or
-- 'admin') can register participants/staff and record Fiesta event data, but
-- editing/deleting is scoped to records the caller themselves created (or any
-- record, for admins). Reads stay open to every signed-in user (unchanged
-- from 0002_rls.sql). Only the true admin surfaces (/admin,
-- /admin/registrations, /admin/settings — user role management and
-- app_config) stay admin-only.
--
-- `createdBy`/`recordedBy`/`submittedByUid` are forced to the caller's own
-- uid on insert (via a column default, so it's set even if the app forgets
-- to pass it, plus the app explicitly sets it too) and used as the ownership
-- check on update/delete. Rows inserted before this migration have a null
-- owner column, so only admins can edit/delete those legacy rows — that's
-- the same restriction that already applied to them (admin-only writes).
--
-- Run AFTER 0001_init.sql and 0002_rls.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Column defaults so the owner column is always populated on insert, even if
-- a caller forgets to set it explicitly.
-- ---------------------------------------------------------------------------
alter table public.registrations
    alter column "createdBy" set default auth.uid();

alter table public.staff_registrations
    alter column "submittedByUid" set default auth.uid();

-- ---------------------------------------------------------------------------
-- registrations: any signed-in user can insert (owned by themselves);
-- update/delete only their own rows, or any row if admin.
-- ---------------------------------------------------------------------------
drop policy if exists "registrations_write_admin" on public.registrations;

create policy "registrations_insert_signed_in" on public.registrations
    for insert with check (auth.uid() is not null and "createdBy" = auth.uid());

create policy "registrations_update_own_or_admin" on public.registrations
    for update
    using (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()));

create policy "registrations_delete_own_or_admin" on public.registrations
    for delete using (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------------
-- staff_registrations: same pattern, owner column is submittedByUid.
-- ---------------------------------------------------------------------------
drop policy if exists "staff_registrations_write_admin" on public.staff_registrations;

create policy "staff_registrations_insert_signed_in" on public.staff_registrations
    for insert with check (auth.uid() is not null and "submittedByUid" = auth.uid());

create policy "staff_registrations_update_own_or_admin" on public.staff_registrations
    for update
    using (auth.uid() is not null and ("submittedByUid" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("submittedByUid" = auth.uid() or public.is_admin()));

create policy "staff_registrations_delete_own_or_admin" on public.staff_registrations
    for delete using (auth.uid() is not null and ("submittedByUid" = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------------
-- sports: insert = any signed-in user (createdBy forced to caller, unchanged
-- from the original intent); update/delete = own or admin.
-- ---------------------------------------------------------------------------
drop policy if exists "sports_insert_staff" on public.sports;
create policy "sports_insert_signed_in" on public.sports
    for insert with check (auth.uid() is not null and "createdBy" = auth.uid());

drop policy if exists "sports_update_staff" on public.sports;
create policy "sports_update_own_or_admin" on public.sports
    for update
    using (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()));

drop policy if exists "sports_delete_staff" on public.sports;
create policy "sports_delete_own_or_admin" on public.sports
    for delete using (auth.uid() is not null and ("createdBy" = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------------
-- results / injuries / decisions: insert = any signed-in user (recordedBy
-- forced to caller); update/delete = own or admin.
-- ---------------------------------------------------------------------------
drop policy if exists "results_insert_staff" on public.results;
create policy "results_insert_signed_in" on public.results
    for insert with check (auth.uid() is not null and "recordedBy" = auth.uid());

drop policy if exists "results_update_staff" on public.results;
create policy "results_update_own_or_admin" on public.results
    for update
    using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

drop policy if exists "results_delete_staff" on public.results;
create policy "results_delete_own_or_admin" on public.results
    for delete using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

drop policy if exists "injuries_insert_staff" on public.injuries;
create policy "injuries_insert_signed_in" on public.injuries
    for insert with check (auth.uid() is not null and "recordedBy" = auth.uid());

drop policy if exists "injuries_update_staff" on public.injuries;
create policy "injuries_update_own_or_admin" on public.injuries
    for update
    using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

drop policy if exists "injuries_delete_staff" on public.injuries;
create policy "injuries_delete_own_or_admin" on public.injuries
    for delete using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

drop policy if exists "decisions_insert_staff" on public.decisions;
create policy "decisions_insert_signed_in" on public.decisions
    for insert with check (auth.uid() is not null and "recordedBy" = auth.uid());

drop policy if exists "decisions_update_staff" on public.decisions;
create policy "decisions_update_own_or_admin" on public.decisions
    for update
    using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()))
    with check (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

drop policy if exists "decisions_delete_staff" on public.decisions;
create policy "decisions_delete_own_or_admin" on public.decisions
    for delete using (auth.uid() is not null and ("recordedBy" = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------------
-- Deliberately unchanged (stay admin-only): profiles (role management),
-- houses, app_config, program_metrics (unused by the UI; not a route any
-- signed-in role can reach).
-- ---------------------------------------------------------------------------
