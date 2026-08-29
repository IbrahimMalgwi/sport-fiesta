-- =============================================================================
-- 0011_all_staff_house_assignment.sql — house assignment expands from
-- Marshal-only to EVERY staff designation (Counsellor, Medic, Media, Sound,
-- Welfare, Data, Security, Other).
--
-- Supersedes public.register_staff() from 0009_atomic_house_assignment.sql:
-- that version derived house eligibility as `p_designation = 'Marshal'`.
-- This replaces it with unconditional eligibility — every staff registration
-- is now drawn from the same balanced pool (registrations + staff_registrations)
-- via the same public.pick_balanced_house() participants use. No separate
-- assignment algorithm is introduced; only the eligibility gate changes.
--
-- Run AFTER 0010_fixed_sports_catalog.sql.
-- =============================================================================

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
    v_house_key         text;
    v_house_name        text;
    v_house_color       text;
    v_row               public.staff_registrations;
begin
    -- Every staff registration is house-eligible now, regardless of
    -- designation. Held for the rest of this transaction, same as
    -- register_participant, so the two stay serialized against each other.
    perform pg_advisory_xact_lock(hashtext('sports_fiesta_house_assignment')::bigint);
    select key, name, color into v_house_key, v_house_name, v_house_color
    from public.pick_balanced_house(p_house_keys, p_house_names, p_house_colors);

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
