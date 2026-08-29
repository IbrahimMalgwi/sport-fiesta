-- =============================================================================
-- 0013_house_scoped_representatives.sql — representative selection is now
-- scoped to the acting Marshal/Counsellor's own house (server-side, not just
-- in the UI), and Counsellors gain the same representative-selection access
-- Marshals already had.
--
-- public.current_staff_house_key() resolves the calling user's own house by
-- looking up their staff_registrations row (linked via auth_user_id — see
-- the link_staff_auth_user trigger in 0008_fiesta_enhancements.sql). Admins
-- are exempt from the house-scoping check below, same as every other
-- Fiesta-module policy that distinguishes admin from staff.
--
-- Run AFTER 0012_participant_house_age_range.sql.
-- =============================================================================

create or replace function public.current_staff_house_key()
returns text
language sql
security definer
stable
set search_path = public
as $$
    select "houseKey"
    from public.staff_registrations
    where auth_user_id = auth.uid() and "houseKey" is not null
    order by created_at desc
    limit 1;
$$;

revoke execute on function public.current_staff_house_key() from public;
grant execute on function public.current_staff_house_key() to authenticated;

-- ---------------------------------------------------------------------------
-- event_representatives: Marshals and Counsellors (not just Marshals) can
-- select/remove representatives, but only for their own house. Admins are
-- unrestricted, as before.
-- ---------------------------------------------------------------------------
drop policy if exists "representatives_insert_marshal" on public.event_representatives;
create policy "representatives_insert_own_house" on public.event_representatives
  for insert to authenticated with check (
    (public.is_marshal_or_admin() or public.is_counsellor_or_admin())
    and "selectedBy" = (select auth.uid())
    and (public.is_admin() or "houseKey" = public.current_staff_house_key())
  );

drop policy if exists "representatives_delete_marshal" on public.event_representatives;
create policy "representatives_delete_own_house" on public.event_representatives
  for delete to authenticated using (
    (public.is_marshal_or_admin() or public.is_counsellor_or_admin())
    and (public.is_admin() or "houseKey" = public.current_staff_house_key())
  );
