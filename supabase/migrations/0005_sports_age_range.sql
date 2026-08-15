-- =============================================================================
-- 0005_sports_age_range.sql — optional age-eligibility range for sporting
-- activities. Not every sport is age-restricted, so both columns are
-- nullable; leave both blank for "open to all ages".
--
-- Column naming: quoted camelCase ("minAge"/"maxAge"), matching the existing
-- domain-column convention in this schema (e.g. "ageGroup", "houseKey") — see
-- the note at the top of 0001_init.sql. This is distinct from reg_no on
-- registrations, which is deliberately snake_case as a DB-generated audit-
-- style identifier rather than a user-entered domain field.
--
-- Run AFTER 0001_init.sql (creates public.sports).
-- =============================================================================

alter table public.sports
    add column if not exists "minAge" integer,
    add column if not exists "maxAge" integer;

alter table public.sports
    drop constraint if exists sports_age_range_check;

alter table public.sports
    add constraint sports_age_range_check
    check ("minAge" is null or "maxAge" is null or "minAge" <= "maxAge");
