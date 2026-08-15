-- =============================================================================
-- 0003_registration_number.sql — unique registration/matric number for
-- public.registrations (teens/participants only; staff_registrations is
-- intentionally NOT touched — marshals/counselors/support staff never get a
-- house or a reg number, per the Sports Fiesta rules).
--
-- Format: "<edition>-<6-digit sequence>", e.g. "5.0-000042". The sequence is
-- global (not per-edition) so numbers never collide across editions even if
-- the `edition` free-text field is edited later.
--
-- Run AFTER 0001_init.sql and 0002_rls.sql.
-- =============================================================================

create sequence if not exists public.registrations_reg_no_seq;

alter table public.registrations
    add column if not exists reg_no text;

create or replace function public.set_registration_reg_no()
returns trigger language plpgsql as $$
begin
    if new.reg_no is null then
        new.reg_no := coalesce(nullif(new.edition, ''), 'SF') || '-' ||
            lpad(nextval('public.registrations_reg_no_seq')::text, 6, '0');
    end if;
    return new;
end;
$$;

drop trigger if exists trg_set_registration_reg_no on public.registrations;
create trigger trg_set_registration_reg_no
    before insert on public.registrations
    for each row execute function public.set_registration_reg_no();

-- Backfill any pre-existing rows (ordered by created_at so earlier
-- registrants keep lower numbers).
with numbered as (
    select id, row_number() over (order by created_at) as rn
    from public.registrations
    where reg_no is null
)
update public.registrations r
set reg_no = coalesce(nullif(r.edition, ''), 'SF') || '-' ||
    lpad(nextval('public.registrations_reg_no_seq')::text, 6, '0')
from numbered n
where r.id = n.id;

alter table public.registrations
    add constraint registrations_reg_no_unique unique (reg_no);

create index if not exists idx_registrations_reg_no on public.registrations (reg_no);
