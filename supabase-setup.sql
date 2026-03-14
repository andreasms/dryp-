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


-- ═══════════════════════════════════════════
-- DRYP Phase 1 Migration
-- Batch-centret produktion, lot-tracking,
-- lagerbevægelser og batch-tidslinje
-- Kør dette i Supabase SQL Editor EFTER
-- det originale setup-script ovenfor
-- ═══════════════════════════════════════════


-- ───────────────────────────────────────────
-- BATCHES
-- Central produktionsenhed. recipe_snapshot
-- fryser opskriften på produktionstidspunktet
-- så ændringer aldrig rammer historiske poster.
-- ───────────────────────────────────────────
create table if not exists batches (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  batch_number     text        not null,
  recipe_id        text        not null,
  recipe_snapshot  jsonb       not null,
  status           text        not null default 'planned'
                               check (status in ('planned','in_progress','completed','failed','recalled')),
  planned_qty      integer,
  actual_qty       integer,
  planned_date     date,
  started_at       timestamptz,
  completed_at     timestamptz,
  operator         text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists batches_user_id_idx      on batches (user_id);
create index if not exists batches_status_idx       on batches (user_id, status);
create index if not exists batches_planned_date_idx on batches (user_id, planned_date desc);

create trigger batches_updated_at
  before update on batches
  for each row
  execute function update_updated_at();


-- ───────────────────────────────────────────
-- LOTS
-- Indgående råvarelots. qty_remaining opdateres
-- ved forbrug via inventory_movements.
-- ───────────────────────────────────────────
create table if not exists lots (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  item_id          text        not null,
  lot_number       text        not null,
  supplier         text,
  received_date    date,
  expiry_date      date,
  qty_received     numeric     not null check (qty_received > 0),
  qty_remaining    numeric     not null check (qty_remaining >= 0),
  unit             text        not null,
  cost_per_unit    numeric     check (cost_per_unit >= 0),
  certificate_ref  text,
  notes            text,
  created_at       timestamptz not null default now(),
  constraint lots_remaining_lte_received check (qty_remaining <= qty_received)
);

create index if not exists lots_user_id_idx   on lots (user_id);
create index if not exists lots_item_id_idx   on lots (user_id, item_id);
create index if not exists lots_expiry_idx    on lots (user_id, expiry_date);


-- ───────────────────────────────────────────
-- INVENTORY_MOVEMENTS
-- Uforanderlig lagerbevægelseskladde.
-- Rækker må aldrig opdateres eller slettes.
-- Aktuel beholdning = SUM(qty) per item_id.
-- ───────────────────────────────────────────
create table if not exists inventory_movements (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references auth.users(id) on delete cascade,
  item_id          text        not null,
  lot_id           uuid        references lots(id),
  batch_id         uuid        references batches(id),
  movement_type    text        not null
                               check (movement_type in ('receipt','consumption','adjustment','waste','return','produce')),
  qty              numeric     not null,
  unit             text        not null,
  reference        text,
  notes            text,
  created_at       timestamptz not null default now(),
  created_by       text
);

create index if not exists movements_user_id_idx  on inventory_movements (user_id);
create index if not exists movements_item_id_idx  on inventory_movements (user_id, item_id);
create index if not exists movements_batch_id_idx on inventory_movements (batch_id);
create index if not exists movements_lot_id_idx   on inventory_movements (lot_id);
create index if not exists movements_created_idx  on inventory_movements (user_id, created_at desc);


-- ───────────────────────────────────────────
-- BATCH_EVENTS
-- Tidslinjepost per batch. Append-only.
-- Bruges til HACCP-dokumentation og audit.
-- ───────────────────────────────────────────
create table if not exists batch_events (
  id               uuid        primary key default gen_random_uuid(),
  batch_id         uuid        not null references batches(id) on delete cascade,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  event_type       text        not null
                               check (event_type in (
                                 'created','started','step_completed',
                                 'ccp_recorded','completed','deviation',
                                 'note','recalled'
                               )),
  step_index       integer,
  payload          jsonb,
  created_at       timestamptz not null default now(),
  created_by       text
);

create index if not exists batch_events_batch_id_idx on batch_events (batch_id, created_at asc);
create index if not exists batch_events_user_id_idx  on batch_events (user_id);


-- ───────────────────────────────────────────
-- BATCH_LOT_USAGE
-- Kobler batches til de specifikke lots der
-- blev forbrugt. Grundlag for sporbarhed.
-- ───────────────────────────────────────────
create table if not exists batch_lot_usage (
  id               uuid        primary key default gen_random_uuid(),
  batch_id         uuid        not null references batches(id) on delete cascade,
  lot_id           uuid        not null references lots(id),
  item_id          text        not null,
  qty_used         numeric     not null check (qty_used > 0),
  unit             text        not null,
  created_at       timestamptz not null default now()
);

create index if not exists batch_lot_usage_batch_id_idx on batch_lot_usage (batch_id);
create index if not exists batch_lot_usage_lot_id_idx   on batch_lot_usage (lot_id);


-- ───────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ───────────────────────────────────────────
alter table batches              enable row level security;
alter table lots                 enable row level security;
alter table inventory_movements  enable row level security;
alter table batch_events         enable row level security;
alter table batch_lot_usage      enable row level security;

-- batches
create policy "Users can view own batches"
  on batches for select
  using (auth.uid() = user_id);

create policy "Users can insert own batches"
  on batches for insert
  with check (auth.uid() = user_id);

create policy "Users can update own batches"
  on batches for update
  using (auth.uid() = user_id);

-- lots
create policy "Users can view own lots"
  on lots for select
  using (auth.uid() = user_id);

create policy "Users can insert own lots"
  on lots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own lots"
  on lots for update
  using (auth.uid() = user_id);

-- inventory_movements (insert-only from client; no update/delete policies)
create policy "Users can view own movements"
  on inventory_movements for select
  using (auth.uid() = user_id);

create policy "Users can insert own movements"
  on inventory_movements for insert
  with check (auth.uid() = user_id);

-- batch_events (insert-only from client; no update/delete policies)
create policy "Users can view own batch events"
  on batch_events for select
  using (auth.uid() = user_id);

create policy "Users can insert own batch events"
  on batch_events for insert
  with check (auth.uid() = user_id);

-- batch_lot_usage — access controlled via batch ownership
create policy "Users can view own batch lot usage"
  on batch_lot_usage for select
  using (
    exists (
      select 1 from batches b
      where b.id = batch_lot_usage.batch_id
        and b.user_id = auth.uid()
    )
  );

create policy "Users can insert own batch lot usage"
  on batch_lot_usage for insert
  with check (
    exists (
      select 1 from batches b
      where b.id = batch_lot_usage.batch_id
        and b.user_id = auth.uid()
    )
  );


-- ───────────────────────────────────────────
-- HELPER VIEWS
-- ───────────────────────────────────────────

-- Aktuel beholdning per item beregnet fra bevægelseskladden
create or replace view stock_levels as
  select
    user_id,
    item_id,
    sum(qty)              as current_qty,
    count(*)              as movement_count,
    max(created_at)       as last_movement_at
  from inventory_movements
  group by user_id, item_id;

-- Aktive lots (qty_remaining > 0) med udløbsadvarsel
create or replace view active_lots as
  select
    *,
    (expiry_date - current_date)  as days_until_expiry,
    case
      when expiry_date < current_date              then 'expired'
      when expiry_date <= current_date + interval '30 days' then 'expiring_soon'
      else 'ok'
    end                           as expiry_status
  from lots
  where qty_remaining > 0;


-- ───────────────────────────────────────────
-- HACCP_LOGS
-- Egenkontrol-logs med kategori og payload.
-- Én tabel for alle typer (cleaning, temps,
-- receiving, deviations, maintenance).
-- Kategori-specifikke felter i payload (jsonb).
-- ───────────────────────────────────────────
create table if not exists haccp_logs (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references auth.users(id) on delete cascade,
  category      text        not null
                            check (category in ('cleaning','temps','receiving','deviations','maintenance')),
  log_date      date        not null,
  operator      text,
  payload       jsonb       not null default '{}',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists haccp_logs_date_idx     on haccp_logs (user_id, log_date desc);
create index if not exists haccp_logs_cat_date_idx on haccp_logs (user_id, category, log_date desc);

alter table haccp_logs enable row level security;

create policy "Users can view own haccp logs"
  on haccp_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own haccp logs"
  on haccp_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own haccp logs"
  on haccp_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own haccp logs"
  on haccp_logs for delete
  using (auth.uid() = user_id);


-- ═══════════════════════════════════════════
-- DRYP Shared-Team Migration
-- Converts all operational tables from
-- per-user RLS to team-based RLS using
-- team_members whitelist.
-- Kør dette i Supabase SQL Editor.
-- ═══════════════════════════════════════════


-- ─── STEP 1: HELPER FUNCTION ───
-- Reusable check: is the current user a team member?
create or replace function is_team_member()
returns boolean as $$
  select exists (
    select 1 from team_members
    where email = auth.jwt() ->> 'email'
  )
$$ language sql security definer stable;


-- ─── STEP 2: COPY app_data → team_data ───
-- Picks the most complete app_data row (largest JSON)
-- and inserts/updates into team_data for team_id = 'dryp'.
-- Safe to run multiple times.
insert into team_data (team_id, data, updated_at)
  select 'dryp', data, now()
  from app_data
  order by length(data::text) desc
  limit 1
on conflict (team_id) do update
  set data = excluded.data,
      updated_at = now()
  where length(excluded.data::text) > length(team_data.data::text);


-- ─── STEP 3: REPLACE PER-USER RLS WITH TEAM RLS ───

-- batches
drop policy if exists "Users can view own batches" on batches;
drop policy if exists "Users can insert own batches" on batches;
drop policy if exists "Users can update own batches" on batches;
create policy "Team can view batches" on batches for select using (is_team_member());
create policy "Team can insert batches" on batches for insert with check (is_team_member());
create policy "Team can update batches" on batches for update using (is_team_member());

-- lots
drop policy if exists "Users can view own lots" on lots;
drop policy if exists "Users can insert own lots" on lots;
drop policy if exists "Users can update own lots" on lots;
create policy "Team can view lots" on lots for select using (is_team_member());
create policy "Team can insert lots" on lots for insert with check (is_team_member());
create policy "Team can update lots" on lots for update using (is_team_member());

-- inventory_movements
drop policy if exists "Users can view own movements" on inventory_movements;
drop policy if exists "Users can insert own movements" on inventory_movements;
create policy "Team can view movements" on inventory_movements for select using (is_team_member());
create policy "Team can insert movements" on inventory_movements for insert with check (is_team_member());

-- batch_events
drop policy if exists "Users can view own batch events" on batch_events;
drop policy if exists "Users can insert own batch events" on batch_events;
create policy "Team can view batch events" on batch_events for select using (is_team_member());
create policy "Team can insert batch events" on batch_events for insert with check (is_team_member());

-- batch_lot_usage
drop policy if exists "Users can view own batch lot usage" on batch_lot_usage;
drop policy if exists "Users can insert own batch lot usage" on batch_lot_usage;
create policy "Team can view batch lot usage" on batch_lot_usage for select using (is_team_member());
create policy "Team can insert batch lot usage" on batch_lot_usage for insert with check (is_team_member());

-- haccp_logs
drop policy if exists "Users can view own haccp logs" on haccp_logs;
drop policy if exists "Users can insert own haccp logs" on haccp_logs;
drop policy if exists "Users can update own haccp logs" on haccp_logs;
drop policy if exists "Users can delete own haccp logs" on haccp_logs;
create policy "Team can view haccp logs" on haccp_logs for select using (is_team_member());
create policy "Team can insert haccp logs" on haccp_logs for insert with check (is_team_member());
create policy "Team can update haccp logs" on haccp_logs for update using (is_team_member());
create policy "Team can delete haccp logs" on haccp_logs for delete using (is_team_member());


-- ───────────────────────────────────────────
-- WIKI_PAGES
-- Delte wiki-sider for teamet.
-- Bruges til SOP'er, mødenoter, leverandør-
-- noter, interne instruktioner.
-- ───────────────────────────────────────────
create table if not exists wiki_pages (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null default '',
  content       text        not null default '',
  created_by    uuid        not null references auth.users(id),
  updated_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists wiki_pages_updated_idx on wiki_pages (updated_at desc);

alter table wiki_pages enable row level security;

create policy "Team can view wiki" on wiki_pages for select using (is_team_member());
create policy "Team can insert wiki" on wiki_pages for insert with check (is_team_member());
create policy "Team can update wiki" on wiki_pages for update using (is_team_member());
create policy "Team can delete wiki" on wiki_pages for delete using (is_team_member());


-- ───────────────────────────────────────────
-- TEAM_MESSAGES
-- Delt team-chat. Append-only i v1.
-- author_name denormaliseret for simpel visning.
-- ───────────────────────────────────────────
create table if not exists team_messages (
  id            uuid        primary key default gen_random_uuid(),
  author_id     uuid        not null references auth.users(id),
  author_name   text        not null default '',
  content       text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists team_messages_created_idx on team_messages (created_at desc);

alter table team_messages enable row level security;

create policy "Team can view messages" on team_messages for select using (is_team_member());
create policy "Team can insert messages" on team_messages for insert with check (is_team_member());
