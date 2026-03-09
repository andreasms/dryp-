-- ═══════════════════════════════════════════
-- DRYP App v2.0 — Delt team-database
-- Kør dette i Supabase SQL Editor
-- ═══════════════════════════════════════════

-- ─── 1. TEAM MEMBERS TABEL ───
-- Whitelist over tilladte emails
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text not null default '',
  role text not null default 'member',  -- 'admin' eller 'member'
  created_at timestamptz not null default now()
);

-- Indsæt jeres 3 teammedlemmer (ÆNDR til jeres rigtige emails!)
insert into team_members (email, name, role) values
  ('andreas@example.com', 'Andreas', 'admin'),
  ('heuckmikkel@gmail.com', 'Partner 1', 'member'),
  ('info@jpgroent.dk', 'Partner 2', 'member')
on conflict (email) do nothing;

-- ─── 2. DELT TEAM DATA TABEL ───
-- Én enkelt række med al DRYP data — delt mellem alle teammedlemmer
create table if not exists team_data (
  team_id text primary key default 'dryp',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Indsæt den tomme team-række
insert into team_data (team_id, data)
values ('dryp', '{}')
on conflict (team_id) do nothing;

-- ─── 3. UGENTLIGE ARKIVER (HACCP) ───
create table if not exists weekly_archives (
  id uuid primary key default gen_random_uuid(),
  team_id text not null default 'dryp',
  week_start date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  archived_by uuid references auth.users(id),
  unique(team_id, week_start)
);

-- ─── 4. ROW LEVEL SECURITY ───
alter table team_members enable row level security;
alter table team_data enable row level security;
alter table weekly_archives enable row level security;

-- Teammedlemmer kan se alle teammedlemmer
create policy "Team can view members"
  on team_members for select
  using (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

-- Alle teammedlemmer kan læse team_data
create policy "Team can view data"
  on team_data for select
  using (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

-- Alle teammedlemmer kan indsætte team_data
create policy "Team can insert data"
  on team_data for insert
  with check (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

-- Alle teammedlemmer kan opdatere team_data
create policy "Team can update data"
  on team_data for update
  using (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

-- Arkiver: team kan se og oprette
create policy "Team can view archives"
  on weekly_archives for select
  using (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

create policy "Team can insert archives"
  on weekly_archives for insert
  with check (
    auth.jwt() ->> 'email' in (select email from team_members)
  );

-- ─── 5. AUTO-UPDATE TIMESTAMP ───
create or replace function update_team_data_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger team_data_updated_at
  before update on team_data
  for each row
  execute function update_team_data_timestamp();

-- ─── 6. MIGRERING FRA GAMMEL TABEL (valgfrit) ───
-- Hvis du allerede har data i app_data, kan du kopiere det over:
-- insert into team_data (team_id, data)
--   select 'dryp', data from app_data limit 1
--   on conflict (team_id) do update set data = excluded.data;

-- ═══════════════════════════════════════════
-- FÆRDIG! Nu peger appen på team_data i stedet
-- for app_data, og alle 3 brugere deler data.
-- ═══════════════════════════════════════════

