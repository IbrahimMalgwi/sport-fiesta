-- =============================================================================
-- 0010_fixed_sports_catalog.sql — Sporting activities become a FIXED,
-- admin-defined catalog (Sports Fiesta 5.0's 33 event categories) instead of
-- something any admin can freely add to at runtime. The app-side "Add Sport"
-- form is removed; from now on the catalog is only ever changed by editing
-- this migration (or, if genuinely needed later, an admin editing a row
-- directly — RLS already restricts sports writes to admins, unchanged here).
--
-- New columns:
--   "eventGroup"    text    — the section header from the Fiesta programme
--                             (Team Sports / Track & Field / Fun & Field
--                             Games / Mind & Social Games), for grouping the
--                             33 events in dropdowns instead of one flat list.
--   "sortOrder"     integer — the event's number (1-33) in the programme, so
--                             the UI can render them in programme order.
--   "medalEligible" boolean — false for Mind & Social Games (Charades, Board
--                             Games, Card Games): these are recorded without
--                             a medal/points, per the Fiesta rules. Every
--                             other event stays true (unchanged behavior).
--
-- DATA NOTE: this migration clears whatever is currently in public.sports
-- (ad hoc/test rows created through the old "Add Sport" form) and reseeds
-- the fixed 33. This is safe for existing data: results.sportId is
-- ON DELETE SET NULL (0001), so any existing public.results rows keep their
-- own name/medal/points — they just lose the live FK link to a sports row
-- that no longer exists. event_representatives."sportId" is ON DELETE
-- CASCADE (0008); if representative rows already exist for the old ad hoc
-- sports, they will be removed along with those rows.
--
-- Run AFTER 0009_atomic_house_assignment.sql.
-- =============================================================================

alter table public.sports
    add column if not exists "eventGroup"    text,
    add column if not exists "sortOrder"     integer,
    add column if not exists "medalEligible" boolean not null default true;

-- Replace whatever is currently in the catalog with the fixed 33.
delete from public.sports;

insert into public.sports
    ("name", category, "minAge", "maxAge", "ageCategory", "eventGroup", "sortOrder", "medalEligible")
values
    -- Team Sports
    ('Soccer',              'Male',   13, 15, '13-15', 'Team Sports',         1, true),
    ('Soccer',              'Male',   16, 19, '16-19', 'Team Sports',         2, true),
    ('Soccer',              'Female', 13, 19, '13-19', 'Team Sports',         3, true),
    ('Basketball',          'Male',   null, null, 'Open', 'Team Sports',      4, true),
    ('Basketball',          'Female', null, null, 'Open', 'Team Sports',      5, true),
    ('Volleyball',          'Male',   null, null, 'Open', 'Team Sports',      6, true),
    ('Volleyball',          'Female', null, null, 'Open', 'Team Sports',      7, true),

    -- Track & Field
    ('100m',                'Male',   13, 15, '13-15', 'Track & Field',       8, true),
    ('100m',                'Female', 13, 15, '13-15', 'Track & Field',       9, true),
    ('100m',                'Male',   16, 19, '16-19', 'Track & Field',      10, true),
    ('100m',                'Female', 16, 19, '16-19', 'Track & Field',      11, true),
    ('800m',                'Male',   null, null, 'Open', 'Track & Field',   12, true),
    ('800m',                'Female', null, null, 'Open', 'Track & Field',   13, true),
    ('4x100m',              'Male',   13, 15, '13-15', 'Track & Field',      14, true),
    ('4x100m',              'Female', 13, 15, '13-15', 'Track & Field',      15, true),
    ('4x100m',              'Male',   16, 19, '16-19', 'Track & Field',      16, true),
    ('4x100m',              'Female', 16, 19, '16-19', 'Track & Field',      17, true),
    ('4x400m',              'Male',   null, null, 'Open', 'Track & Field',   18, true),
    ('4x400m',              'Female', null, null, 'Open', 'Track & Field',   19, true),

    -- Fun & Field Games
    ('Sack Race',           'Mixed',  null, null, 'Open', 'Fun & Field Games', 20, true),
    ('Lime & Spoon',        'Male',   null, null, 'Open', 'Fun & Field Games', 21, true),
    ('Lime & Spoon',        'Female', null, null, 'Open', 'Fun & Field Games', 22, true),
    ('Wheelbarrow Race',    'Male',   null, null, 'Open', 'Fun & Field Games', 23, true),
    ('Wheelbarrow Race',    'Female', null, null, 'Open', 'Fun & Field Games', 24, true),
    ('Three-Legged Race',   'Male',   null, null, 'Open', 'Fun & Field Games', 25, true),
    ('Three-Legged Race',   'Female', null, null, 'Open', 'Fun & Field Games', 26, true),
    ('Picking the Pebbles', 'Male',   null, null, 'Open', 'Fun & Field Games', 27, true),
    ('Picking the Pebbles', 'Female', null, null, 'Open', 'Fun & Field Games', 28, true),
    ('Balloon Burst',       'Male',   null, null, 'Open', 'Fun & Field Games', 29, true),
    ('Balloon Burst',       'Female', null, null, 'Open', 'Fun & Field Games', 30, true),

    -- Mind & Social Games — no medals
    ('Charades',            'Mixed',  null, null, 'Open', 'Mind & Social Games', 31, false),
    ('Board Games',         'Mixed',  null, null, 'Open', 'Mind & Social Games', 32, false),
    ('Card Games',          'Mixed',  null, null, 'Open', 'Mind & Social Games', 33, false);
