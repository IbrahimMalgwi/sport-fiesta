-- =============================================================================
-- 0012_participant_house_age_range.sql — participant house-assignment age
-- eligibility changes from 5-20 to 9-and-up (no upper bound).
--
-- Supersedes the registrations_house_age_check constraint added by
-- 0008_fiesta_enhancements.sql (`age between 5 and 20`). The client-side
-- eligibility check in app/(member)/register/page.jsx (completeRegistration)
-- is updated to match in the same change.
-- =============================================================================

alter table public.registrations drop constraint if exists registrations_house_age_check;
alter table public.registrations add constraint registrations_house_age_check check (
  (age >= 9) or
  (coalesce(assigned, false) = false and "houseKey" is null and house is null)
) not valid;
