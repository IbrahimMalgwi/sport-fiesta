-- =============================================================================
-- 0001_init.sql — Postgres schema replacing the Firestore collections.
--
-- NOTE ON COLUMN NAMING: the React app uses camelCase field names throughout
-- (e.g. houseKey, attendingThisFiesta, personId). To keep the CRA -> Next port
-- low-risk, the *domain* columns are named to match those field names exactly
-- (quoted camelCase identifiers), so ported components can keep inserting/
-- reading the same object shapes. Only DB-managed / audit columns use
-- snake_case (id, created_at, created_by/…). A future normalization pass can
-- rename these to snake_case + a mapping layer if preferred.
--
-- Run this in the Supabase SQL editor (or via `supabase db push`) BEFORE
-- 0002_rls.sql. See SUPABASE_SETUP.md.
-- =============================================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles  (replaces Firestore `users`; 1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
    id                  uuid primary key references auth.users(id) on delete cascade,
    email               text,
    role                text not null default 'user' check (role in ('user','staff','admin')),
    display_name        text,
    phone               text,
    profile_picture     text,
    deletion_requested  boolean default false,
    created_at          timestamptz default now(),
    updated_at          timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- houses  (seeded from src/utils/houseMapping.js)
-- ---------------------------------------------------------------------------
create table if not exists public.houses (
    id          bigint generated always as identity primary key,
    key         text unique not null,
    name        text not null,
    short_name  text,
    color       text
);

insert into public.houses (key, name, short_name, color) values
    ('saviour',    'Jesus Christ Our Saviour',                 'Our Saviour',          '#FF0000'),
    ('holyGhost',  'Jesus Christ The Holy Ghost Baptizer',     'Holy Ghost Baptizer',  '#FFD700'),
    ('healer',     'Jesus Christ Our Healer',                  'Our Healer',           '#0000FF'),
    ('comingKing', 'Jesus Christ Our Coming King',             'Our Coming King',      '#800080')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- registrations  (participants; house assignment; role; fiesta history)
-- fiestaAttendance kept as text[] to match the app's array usage. A child
-- table (registration_editions) is a reasonable future normalization.
-- ---------------------------------------------------------------------------
create table if not exists public.registrations (
    id                    uuid primary key default gen_random_uuid(),
    "name"                text,
    age                   integer,
    sex                   text,
    religion              text,
    role                  text default 'Participant',
    phone                 text,
    email                 text,
    house                 text,
    color                 text,
    "houseKey"            text,
    assigned              boolean default false,
    "attendingThisFiesta" text,
    "fiestaAttendance"    text[] default '{}',
    edition               text,
    "createdBy"           uuid references auth.users(id) on delete set null,
    created_at            timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- staff_registrations  (marshals/counselors/volunteers)
-- ---------------------------------------------------------------------------
create table if not exists public.staff_registrations (
    id                 uuid primary key default gen_random_uuid(),
    "name"             text,
    phone              text,
    email              text,
    organization       text,
    designation        text,
    "otherDesignation" text,
    "finalDesignation" text,
    "registrationType" text,
    "submittedByUid"   uuid references auth.users(id) on delete set null,
    "submittedByEmail" text,
    "submittedByName"  text,
    extra              jsonb,             -- escape hatch for extra form fields
    created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- program_metrics  (spiritual/sporting metric entries)
-- ---------------------------------------------------------------------------
create table if not exists public.program_metrics (
    id                   uuid primary key default gen_random_uuid(),
    "participantName"    text,
    "decisionForChrist"  boolean default false,
    "holyGhostBaptism"   boolean default false,
    injured              boolean default false,
    "injuryDetails"      text,
    "receiveCounseling"  boolean default false,
    "counselingDetails"  text,
    "teamWin"            boolean default false,
    "winningTeam"        text,
    "position"           text,
    "sportCategory"      text,
    "sportGender"        text,
    "ageGroup"           text,
    "eventDate"          date,
    extra                jsonb,
    "createdBy"          uuid references auth.users(id) on delete set null,
    created_at           timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- sports  (dynamic activity registry)
-- ---------------------------------------------------------------------------
create table if not exists public.sports (
    id          uuid primary key default gen_random_uuid(),
    "name"      text not null,
    category    text check (category in ('Male','Female','Mixed')),
    "createdBy" uuid references auth.users(id) on delete set null,
    created_at  timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- results  (individual placements -> house tally + personal medals)
-- ---------------------------------------------------------------------------
create table if not exists public.results (
    id           uuid primary key default gen_random_uuid(),
    "sportId"    uuid references public.sports(id) on delete set null,
    "sportName"  text,
    category     text,
    "houseKey"   text,
    house        text,
    medal        text check (medal in ('gold','silver','bronze')),
    points       integer default 0,
    "personId"   uuid references public.registrations(id) on delete set null,
    "personName" text,
    edition      text,
    "recordedBy" uuid references auth.users(id) on delete set null,
    created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- injuries  (injury register)
-- ---------------------------------------------------------------------------
create table if not exists public.injuries (
    id           uuid primary key default gen_random_uuid(),
    "personId"   uuid references public.registrations(id) on delete set null,
    "personName" text,
    "houseKey"   text,
    house        text,
    nature       text,
    medication   text,
    treatment    text,
    "incidentAt" timestamptz,
    notes        text,
    "recordedBy" uuid references auth.users(id) on delete set null,
    created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- decisions  ("Decisions for Christ")
-- ---------------------------------------------------------------------------
create table if not exists public.decisions (
    id             uuid primary key default gen_random_uuid(),
    "personId"     uuid references public.registrations(id) on delete set null,
    "personName"   text,
    "houseKey"     text,
    house          text,
    "decisionDate" date,
    notes          text,
    "counselorId"  uuid references public.registrations(id) on delete set null,
    "counselorName" text,
    "recordedBy"   uuid references auth.users(id) on delete set null,
    created_at     timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- app_config  (single JSONB settings row; replaces Firestore config/app)
-- ---------------------------------------------------------------------------
create table if not exists public.app_config (
    id         integer primary key default 1,
    settings   jsonb not null default '{}',
    updated_at timestamptz default now(),
    constraint app_config_singleton check (id = 1)
);

insert into public.app_config (id, settings) values (
    1,
    jsonb_build_object(
        'currentEdition', '5.0',
        'previousEditions', jsonb_build_array('1.0','2.0','3.0','4.0'),
        'registrantRoles', jsonb_build_array('Participant','Marshal','Counselor'),
        'houseAssignmentCutoff', null,
        'medalPoints', jsonb_build_object('gold', 5, 'silver', 3, 'bronze', 1),
        'houseOverrides', null
    )
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helpful indexes for the dashboard/report queries.
-- ---------------------------------------------------------------------------
create index if not exists idx_registrations_house    on public.registrations ("houseKey");
create index if not exists idx_results_house_edition   on public.results ("houseKey", edition);
create index if not exists idx_results_person          on public.results ("personId");
create index if not exists idx_injuries_house_time     on public.injuries ("houseKey", "incidentAt" desc);
create index if not exists idx_decisions_house_date    on public.decisions ("houseKey", "decisionDate" desc);
