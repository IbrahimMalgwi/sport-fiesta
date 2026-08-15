-- =============================================================================
-- 0004_decisions_counselor_fk.sql — repoint decisions.counselorId at
-- staff_registrations instead of registrations.
--
-- Counselors/Marshals are staff: they register via /staff-registration (the
-- "Counselor/Marshal" designation) and are never house-assigned. The original
-- 0001 schema had decisions.counselorId referencing public.registrations,
-- which assumed counselors were participants with role = 'Counselor' — the
-- same conflation flagged in the routing/registration audit. The app's
-- Decisions form now sources the Counselor picker from staff_registrations,
-- so the FK needs to match.
--
-- Run AFTER 0001_init.sql, 0002_rls.sql and 0003_registration_number.sql.
-- =============================================================================

do $$
declare
    conname text;
begin
    select tc.constraint_name into conname
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'decisions'
      and tc.constraint_type = 'FOREIGN KEY'
      and kcu.column_name = 'counselorId';

    if conname is not null then
        execute format('alter table public.decisions drop constraint %I', conname);
    end if;
end $$;

alter table public.decisions
    add constraint decisions_counselorid_staff_fkey
    foreign key ("counselorId") references public.staff_registrations(id) on delete set null;
