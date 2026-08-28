-- Sports Fiesta enhancement: role-specific access and pre-event representatives.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user','staff','marshal','counsellor','admin'));

alter table public.staff_registrations
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists staff_registrations_auth_user_id_key
  on public.staff_registrations(auth_user_id) where auth_user_id is not null;
update public.staff_registrations sr
set auth_user_id = p.id
from public.profiles p
where sr.auth_user_id is null and lower(sr.email) = lower(p.email)
  and sr.id = (
    select candidate.id from public.staff_registrations candidate
    where lower(candidate.email) = lower(sr.email)
    order by candidate.created_at, candidate.id limit 1
  );

create or replace function public.link_staff_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  select p.id into new.auth_user_id
  from public.profiles p
  where lower(p.email) = lower(new.email)
    and not exists (
      select 1 from public.staff_registrations existing
      where existing.auth_user_id = p.id and existing.id <> new.id
    )
  limit 1;
  return new;
end;
$$;
revoke execute on function public.link_staff_auth_user() from public;
drop trigger if exists link_staff_auth_user_before_write on public.staff_registrations;
create trigger link_staff_auth_user_before_write before insert or update of email
  on public.staff_registrations for each row execute function public.link_staff_auth_user();

alter table public.sports add column if not exists "ageCategory" text;
alter table public.injuries
  add column if not exists "sportId" uuid references public.sports(id) on delete set null,
  add column if not exists severity text;
alter table public.injuries drop constraint if exists injuries_severity_check;
alter table public.injuries add constraint injuries_severity_check
  check (severity is null or severity in ('Minor','Moderate','Severe','Critical'));

-- Reverse the obsolete 0007 behavior: staff never belong to houses.
update public.staff_registrations
set house = null, color = null, "houseKey" = null, assigned = false
where assigned or house is not null or "houseKey" is not null;

create table if not exists public.event_representatives (
  id uuid primary key default gen_random_uuid(),
  "sportId" uuid not null references public.sports(id) on delete cascade,
  "personId" uuid not null references public.registrations(id) on delete cascade,
  "houseKey" text not null,
  edition text not null,
  "selectedBy" uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique ("sportId", "personId", edition)
);
create index if not exists idx_event_representatives_sport
  on public.event_representatives("sportId", edition, "houseKey");
alter table public.event_representatives enable row level security;

create or replace function public.validate_event_representative()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  participant public.registrations%rowtype;
  activity public.sports%rowtype;
begin
  select * into participant from public.registrations where id = new."personId";
  select * into activity from public.sports where id = new."sportId";
  if participant.id is null or activity.id is null then raise exception 'Participant or activity not found'; end if;
  if not coalesce(participant.assigned, false) or participant."houseKey" is distinct from new."houseKey" then
    raise exception 'Participant must belong to the selected house';
  end if;
  if activity.category <> 'Mixed' and participant.sex is distinct from activity.category then
    raise exception 'Participant does not match the activity gender category';
  end if;
  if activity."minAge" is not null and participant.age < activity."minAge" then raise exception 'Participant is below the activity age range'; end if;
  if activity."maxAge" is not null and participant.age > activity."maxAge" then raise exception 'Participant is above the activity age range'; end if;
  return new;
end;
$$;
revoke execute on function public.validate_event_representative() from public;
drop trigger if exists validate_event_representative_before_write on public.event_representatives;
create trigger validate_event_representative_before_write before insert or update
  on public.event_representatives for each row execute function public.validate_event_representative();

create or replace function public.is_marshal_or_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.current_user_role() in ('marshal','admin'), false);
$$;
create or replace function public.is_counsellor_or_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce(public.current_user_role() in ('counsellor','admin'), false);
$$;
revoke execute on function public.current_user_role() from public;
revoke execute on function public.is_admin() from public;
revoke execute on function public.is_staff_or_admin() from public;
revoke execute on function public.is_marshal_or_admin() from public;
revoke execute on function public.is_counsellor_or_admin() from public;
grant execute on function public.current_user_role(), public.is_admin(),
  public.is_staff_or_admin(), public.is_marshal_or_admin(), public.is_counsellor_or_admin()
  to authenticated;

create policy "representatives_select_signed_in" on public.event_representatives
  for select to authenticated using ((select auth.uid()) is not null);
create policy "representatives_insert_marshal" on public.event_representatives
  for insert to authenticated with check (public.is_marshal_or_admin() and "selectedBy" = (select auth.uid()));
create policy "representatives_delete_marshal" on public.event_representatives
  for delete to authenticated using (public.is_marshal_or_admin());

-- Results must reference a participant selected for that event and edition.
alter table public.results add column if not exists "representativeId" uuid
  references public.event_representatives(id) on delete restrict;

create or replace function public.validate_result_representative()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if not exists (
    select 1 from public.event_representatives er
    where er.id = new."representativeId" and er."sportId" = new."sportId"
      and er."personId" = new."personId" and er.edition = new.edition
      and er."houseKey" = new."houseKey"
  ) then
    raise exception 'Result participant is not an eligible representative for this event';
  end if;
  return new;
end;
$$;
revoke execute on function public.validate_result_representative() from public;
drop trigger if exists validate_result_representative_before_write on public.results;
create trigger validate_result_representative_before_write
  before insert or update of "representativeId", "sportId", "personId", edition, "houseKey"
  on public.results for each row execute function public.validate_result_representative();

drop policy if exists "results_insert_signed_in" on public.results;
create policy "results_insert_marshal" on public.results for insert to authenticated
  with check (
    public.is_marshal_or_admin() and "recordedBy" = (select auth.uid()) and
    "representativeId" is not null and exists (
      select 1 from public.event_representatives er
      where er.id = results."representativeId" and er."sportId" = results."sportId"
        and er."personId" = results."personId" and er.edition = results.edition
    )
  );
drop policy if exists "injuries_insert_signed_in" on public.injuries;
create policy "injuries_insert_marshal" on public.injuries for insert to authenticated
  with check (public.is_marshal_or_admin() and "recordedBy" = (select auth.uid()));
drop policy if exists "decisions_insert_signed_in" on public.decisions;
create policy "decisions_insert_counsellor" on public.decisions for insert to authenticated
  with check (public.is_counsellor_or_admin() and "recordedBy" = (select auth.uid()));

-- Remove permissive write policies introduced by 0006 and align every
-- operational mutation with its UI role gate.
drop policy if exists "sports_insert_signed_in" on public.sports;
drop policy if exists "sports_update_own_or_admin" on public.sports;
drop policy if exists "sports_delete_own_or_admin" on public.sports;
create policy "sports_insert_admin" on public.sports for insert to authenticated
  with check (public.is_admin() and "createdBy" = (select auth.uid()));
create policy "sports_update_admin" on public.sports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "sports_delete_admin" on public.sports for delete to authenticated
  using (public.is_admin());

drop policy if exists "results_update_own_or_admin" on public.results;
drop policy if exists "results_delete_own_or_admin" on public.results;
create policy "results_update_marshal" on public.results for update to authenticated
  using (public.is_marshal_or_admin()) with check (public.is_marshal_or_admin());
create policy "results_delete_marshal" on public.results for delete to authenticated
  using (public.is_marshal_or_admin());

drop policy if exists "injuries_update_own_or_admin" on public.injuries;
drop policy if exists "injuries_delete_own_or_admin" on public.injuries;
create policy "injuries_update_marshal" on public.injuries for update to authenticated
  using (public.is_marshal_or_admin()) with check (public.is_marshal_or_admin());
create policy "injuries_delete_marshal" on public.injuries for delete to authenticated
  using (public.is_marshal_or_admin());

drop policy if exists "decisions_update_own_or_admin" on public.decisions;
drop policy if exists "decisions_delete_own_or_admin" on public.decisions;
create policy "decisions_update_counsellor" on public.decisions for update to authenticated
  using (public.is_counsellor_or_admin()) with check (public.is_counsellor_or_admin());
create policy "decisions_delete_counsellor" on public.decisions for delete to authenticated
  using (public.is_counsellor_or_admin());

alter table public.registrations drop constraint if exists registrations_house_age_check;
alter table public.registrations add constraint registrations_house_age_check check (
  (age between 5 and 20) or
  (coalesce(assigned, false) = false and "houseKey" is null and house is null)
) not valid;

grant select, insert, delete on public.event_representatives to authenticated;
