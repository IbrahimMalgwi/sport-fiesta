-- =============================================================================
-- 0015_house_only_results.sql — simplifies result recording to house-only.
-- Marshals/Admins now record just: activity + winning house (+ 2nd/3rd place
-- houses where the activity is medal-eligible) — no participant is tagged.
-- This does NOT touch representative selection (public.event_representatives
-- stays exactly as-is; Marshals still pick who competes per house/sport).
--
-- "personId"/"personName"/"representativeId" stay on public.results (nullable,
-- unchanged) so historical rows keep their data — new rows simply leave them
-- null. The insert policy and the representative-match trigger, which both
-- required a valid representativeId, are relaxed/dropped accordingly.
--
-- Run AFTER 0014_add_church_field.sql.
-- =============================================================================

drop trigger if exists validate_result_representative_before_write on public.results;
drop function if exists public.validate_result_representative();

drop policy if exists "results_insert_marshal" on public.results;
create policy "results_insert_marshal" on public.results for insert to authenticated
  with check (public.is_marshal_or_admin() and "recordedBy" = (select auth.uid()));
