-- =============================================================================
-- 0014_add_church_field.sql — adds a "Church" field to Participant
-- registration. The dropdown's option list is admin-managed via app_config
-- (settings.churches, edited on /admin/settings — see utils/config.js's
-- DEFAULT_CONFIG.churches), the same pattern already used for
-- registrantRoles/previousEditions. Whether picked from the list or typed
-- under "Other", the resulting name is stored in this one plain text column
-- — the client resolves "Other" + free text down to a single string before
-- calling register_participant(), so there is nothing conditional to do here.
--
-- Run AFTER 0013_house_scoped_representatives.sql.
-- =============================================================================

alter table public.registrations add column if not exists church text;

drop function if exists public.register_participant(
    text, integer, text, text, text, text, text[], text, uuid, boolean, text[], text[], text[]
);

create or replace function public.register_participant(
    p_name              text,
    p_age               integer,
    p_sex               text,
    p_religion          text,
    p_church            text,
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
        "name", age, sex, religion, church, phone, email,
        "houseKey", house, color, assigned,
        edition, "createdBy", "fiestaAttendance"
    ) values (
        p_name, p_age, p_sex, p_religion, nullif(p_church, ''), nullif(p_phone, ''), nullif(p_email, ''),
        v_house_key, v_house_name, v_house_color, v_house_key is not null,
        p_edition, p_created_by, coalesce(p_fiesta_attendance, '{}')
    )
    returning * into v_row;

    return v_row;
end;
$$;

revoke execute on function public.register_participant(
    text, integer, text, text, text, text, text, text[], text, uuid, boolean, text[], text[], text[]
) from public;
grant execute on function public.register_participant(
    text, integer, text, text, text, text, text, text[], text, uuid, boolean, text[], text[], text[]
) to authenticated;
