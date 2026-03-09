-- ═══════════════════════════════════════════
-- DRYP App - Supabase Database Setup
-- Kør dette i Supabase SQL Editor (trin 5 i guiden)
-- ═══════════════════════════════════════════

-- Tabel til app-data (JSON storage)
create table if not exists app_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Ugentlige arkiver (HACCP compliance)
create table if not exists weekly_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  week_start date not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, week_start)
);

-- Row Level Security (kun se egne data)
alter table app_data enable row level security;
alter table weekly_archives enable row level security;

-- Policies: bruger kan kun se/redigere sine egne data
create policy "Users can view own data"
  on app_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on app_data for update
  using (auth.uid() = user_id);

create policy "Users can view own archives"
  on weekly_archives for select
  using (auth.uid() = user_id);

create policy "Users can insert own archives"
  on weekly_archives for insert
  with check (auth.uid() = user_id);

-- Auto-update timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger app_data_updated_at
  before update on app_data
  for each row
  execute function update_updated_at();
