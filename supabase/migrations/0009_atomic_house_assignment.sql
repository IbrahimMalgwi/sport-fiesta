-- =============================================================================
-- 0009_atomic_house_assignment.sql — Marshals now get a house too, and the
-- balanced min-count/random-tiebreak assignment (previously computed
-- client-side, from a possibly-stale read) moves into Postgres so the
-- count-then-insert is one atomic transaction.
--
-- public.pick_balanced_house() is the SINGLE place the assignment algorithm
-- lives. Both public.register_participant() and public.register_staff() call
-- it while holding the same advisory lock, so:
--   * concurrent registrations (participant or Marshal) always see committed,
--     real-time house counts — never a cached/stale value.
--   * two simultaneous registrations can never both land on the same
--     "currently lowest" house.
--   * Marshals and participants are drawn from ONE combined, balanced pool
--     (registrations + staff_registrations), so houses stay even as both
--     register side by side.
--
-- House names/colors are NOT re-derived from public.houses here — the app's
-- single source of truth for house display data is utils/houseMapping.js
-- (via resolveHouses(), which layers admin houseOverrides on top). The
-- client passes that resolved list in on every call, so a future color/name
-- change in one place is reflected everywhere without touching this SQL.
--
-- Run AFTER 0008_fiesta_enhancements.sql.
-- =============================================================================

create or replace function public.pick_balanced_house(
    p_house_keys   text[],
    p_house_names  text[],
    p_house_colors text[]
) returns table(key text, name text, color text)
language plpgsql
security invoker
set search_path = public
as $$
begin
    return query
    select t.key, t.name, t.color
    from unnest(p_house_keys, p_house_names, p_house_colors) as t(key, name, color)
    left join (
        select "houseKey", count(*) as cnt
        from public.registrations
        where assigned and "houseKey" is not null
        group by "houseKey"
        union all
        select "houseKey", count(*) as cnt
        from public.staff_registrations
        where assigned and "houseKey" is not null
        group by "houseKey"
    ) c on c."houseKey" = t.key
    group by t.key, t.name, t.color
    order by coalesce(sum(c.cnt), 0) asc, random()
    limit 1;
end;
$$;

revoke execute on function public.pick_balanced_house(text[], text[], text[]) from public;
grant execute on function public.pick_balanced_house(text[], text[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- register_participant — house-eligibility (age 5-20, not past the
-- admin-set cutoff) stays a client-computed flag, unchanged from before.
-- ---------------------------------------------------------------------------
create or replace function public.register_participant(
    p_name              text,
    p_age               integer,
    p_sex               text,
    p_religion          text,
    p_phone             text,
    p_email             text,
    p_fiesta_attendance text[],
    p_edition           text,
    p_created_by        uuid,
    p_house_eligible    boolean,
    p_house_keys        text[],
    p_house_names       text[],
    p_house_colors      text[]
) returns public.registrations
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_house_key   text;
    v_house_name  text;
    v_house_color text;
    v_row         public.registrations;
begin
    if p_house_eligible then
        -- Held for the rest of this transaction: serializes the count-then-
        -- pick-then-insert against every other concurrent registration
        -- (participant or Marshal) so counts are never stale.
        perform pg_advisory_xact_lock(hashtext('sports_fiesta_house_assignment')::bigint);
        select key, name, color into v_house_key, v_house_name, v_house_color
        from public.pick_balanced_house(p_house_keys, p_house_names, p_house_colors);
    end if;

    insert into public.registrations (
        "name", age, sex, religion, phone, email,
        "houseKey", house, color, assigned,
        edition, "createdBy", "fiestaAttendance"
    ) values (
        p_name, p_age, p_sex, p_religion, nullif(p_phone, ''), nullif(p_email, ''),
        v_house_key, v_house_name, v_house_color, v_house_key is not null,
        p_edition, p_created_by, coalesce(p_fiesta_attendance, '{}')
    )
    returning * into v_row;

    return v_row;
end;
$$;

revoke execute on function public.register_participant(
    text, integer, text, text, text, text, text[], text, uuid, boolean, text[], text[], text[]
) from public;
grant execute on function public.register_participant(
    text, integer, text, text, text, text, text[], text, uuid, boolean, text[], text[], text[]
) to authenticated;

-- ---------------------------------------------------------------------------
-- register_staff — house eligibility is derived server-side (designation =
-- 'Marshal'), not trusted from the client, since this is a new access rule.
-- ---------------------------------------------------------------------------
create or replace function public.register_staff(
    p_name                text,
    p_phone               text,
    p_email               text,
    p_organization        text,
    p_designation         text,
    p_other_designation   text,
    p_submitted_by_uid    uuid,
    p_submitted_by_email  text,
    p_submitted_by_name   text,
    p_house_keys          text[],
    p_house_names         text[],
    p_house_colors        text[]
) returns public.staff_registrations
language plpgsql
security invoker
set search_path = public
as $$
declare
    v_final_designation text := case when p_designation = 'Other' then p_other_designation else p_designation end;
    v_house_eligible     boolean := (p_designation = 'Marshal');
    v_house_key          text;
    v_house_name         text;
    v_house_color        text;
    v_row                public.staff_registrations;
begin
    if v_house_eligible then
        perform pg_advisory_xact_lock(hashtext('sports_fiesta_house_assignment')::bigint);
        select key, name, color into v_house_key, v_house_name, v_house_color
        from public.pick_balanced_house(p_house_keys, p_house_names, p_house_colors);
    end if;

    insert into public.staff_registrations (
        "name", phone, email, organization, designation, "otherDesignation",
        "finalDesignation", "registrationType",
        "submittedByUid", "submittedByEmail", "submittedByName",
        "houseKey", house, color, assigned
    ) values (
        p_name, p_phone, p_email, p_organization, p_designation, p_other_designation,
        v_final_designation, 'staff',
        p_submitted_by_uid, p_submitted_by_email, p_submitted_by_name,
        v_house_key, v_house_name, v_house_color, v_house_key is not null
    )
    returning * into v_row;

    return v_row;
end;
$$;

revoke execute on function public.register_staff(
    text, text, text, text, text, text, uuid, text, text, text[], text[], text[]
) from public;
grant execute on function public.register_staff(
    text, text, text, text, text, text, uuid, text, text, text[], text[], text[]
) to authenticated;
