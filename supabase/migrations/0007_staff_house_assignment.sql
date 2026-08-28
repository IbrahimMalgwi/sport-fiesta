-- =============================================================================
-- 0007_staff_house_assignment.sql — Counselors/Marshals now get a house too.
--
-- Previously only public.registrations (participants) carried a house
-- assignment; staff_registrations (marshals/counselors/support staff) never
-- did (see the note in 0004_decisions_counselor_fk.sql). That's changing for
-- the "Counselor/Marshal" designation specifically — they're assigned a house
-- using the same balanced random distribution as participants, tracked
-- independently (Counselor/Marshal house counts, not mixed with participant
-- counts). Other designations (Medic, Media, Sound, Welfare, Data, Security,
-- Other) are unaffected and stay house-less.
--
-- Run AFTER 0001_init.sql (creates public.staff_registrations).
-- =============================================================================

alter table public.staff_registrations
    add column if not exists house      text,
    add column if not exists color      text,
    add column if not exists "houseKey" text,
    add column if not exists assigned   boolean default false;

create index if not exists idx_staff_registrations_house
    on public.staff_registrations ("houseKey");
