-- =============================================================================
-- 0002_rls.sql — Row Level Security, mirroring the old firestore.rules.
--
-- REVIEW THESE BEFORE APPLYING. Run AFTER 0001_init.sql.
--
-- Roles come from public.profiles.role (read via SECURITY DEFINER helpers to
-- avoid RLS recursion). Access model:
--   * profiles: read own / admin reads all; self-update without role change.
--   * registrations, staff_registrations, program_metrics: read = any signed-in
--     user; writes = admin only.
--   * sports, results, injuries, decisions: read = any signed-in user; create =
--     staff or admin AND the createdBy/recordedBy must be the caller;
--     update/delete = staff or admin.
--   * app_config, houses: read = any signed-in user; writes = admin only.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can read profiles under RLS).
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text language sql security definer stable set search_path = public as $$
    select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
    select coalesce(public.current_user_role() = 'admin', false);
$$;

create or replace function public.is_staff_or_admin()
returns boolean language sql security definer stable set search_path = public as $$
    select coalesce(public.current_user_role() in ('admin','staff'), false);
$$;

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up (replaces the
-- client-side setDoc the Firebase signup used to do).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'user')
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Enable RLS on every table.
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.houses              enable row level security;
alter table public.registrations       enable row level security;
alter table public.staff_registrations enable row level security;
alter table public.program_metrics     enable row level security;
alter table public.sports              enable row level security;
alter table public.results             enable row level security;
alter table public.injuries            enable row level security;
alter table public.decisions           enable row level security;
alter table public.app_config          enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles_select_own_or_admin" on public.profiles
    for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_self" on public.profiles
    for insert with check (id = auth.uid() and role = 'user');

create policy "profiles_update_self_or_admin" on public.profiles
    for update
    using (id = auth.uid() or public.is_admin())
    -- Non-admins may update their own row but MUST NOT change their role.
    with check (public.is_admin() or (id = auth.uid() and role = public.current_user_role()));

create policy "profiles_delete_admin" on public.profiles
    for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- houses (read-only reference data for signed-in users; admin manages)
-- ---------------------------------------------------------------------------
create policy "houses_select_signed_in" on public.houses
    for select using (auth.uid() is not null);
create policy "houses_write_admin" on public.houses
    for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- registrations / staff_registrations / program_metrics
-- read: any signed-in user; write: admin only.
-- ---------------------------------------------------------------------------
create policy "registrations_select_signed_in" on public.registrations
    for select using (auth.uid() is not null);
create policy "registrations_write_admin" on public.registrations
    for all using (public.is_admin()) with check (public.is_admin());

create policy "staff_registrations_select_signed_in" on public.staff_registrations
    for select using (auth.uid() is not null);
create policy "staff_registrations_write_admin" on public.staff_registrations
    for all using (public.is_admin()) with check (public.is_admin());

create policy "program_metrics_select_signed_in" on public.program_metrics
    for select using (auth.uid() is not null);
create policy "program_metrics_write_admin" on public.program_metrics
    for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- sports: read signed-in; create staff/admin (createdBy = caller); manage staff/admin.
-- ---------------------------------------------------------------------------
create policy "sports_select_signed_in" on public.sports
    for select using (auth.uid() is not null);
create policy "sports_insert_staff" on public.sports
    for insert with check (public.is_staff_or_admin() and "createdBy" = auth.uid());
create policy "sports_update_staff" on public.sports
    for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "sports_delete_staff" on public.sports
    for delete using (public.is_staff_or_admin());

-- ---------------------------------------------------------------------------
-- results / injuries / decisions: read signed-in; create staff/admin
-- (recordedBy = caller); update/delete staff/admin.
-- ---------------------------------------------------------------------------
create policy "results_select_signed_in" on public.results
    for select using (auth.uid() is not null);
create policy "results_insert_staff" on public.results
    for insert with check (public.is_staff_or_admin() and "recordedBy" = auth.uid());
create policy "results_update_staff" on public.results
    for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "results_delete_staff" on public.results
    for delete using (public.is_staff_or_admin());

create policy "injuries_select_signed_in" on public.injuries
    for select using (auth.uid() is not null);
create policy "injuries_insert_staff" on public.injuries
    for insert with check (public.is_staff_or_admin() and "recordedBy" = auth.uid());
create policy "injuries_update_staff" on public.injuries
    for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "injuries_delete_staff" on public.injuries
    for delete using (public.is_staff_or_admin());

create policy "decisions_select_signed_in" on public.decisions
    for select using (auth.uid() is not null);
create policy "decisions_insert_staff" on public.decisions
    for insert with check (public.is_staff_or_admin() and "recordedBy" = auth.uid());
create policy "decisions_update_staff" on public.decisions
    for update using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "decisions_delete_staff" on public.decisions
    for delete using (public.is_staff_or_admin());

-- ---------------------------------------------------------------------------
-- app_config: read signed-in; write admin.
-- ---------------------------------------------------------------------------
create policy "app_config_select_signed_in" on public.app_config
    for select using (auth.uid() is not null);
create policy "app_config_write_admin" on public.app_config
    for all using (public.is_admin()) with check (public.is_admin());
