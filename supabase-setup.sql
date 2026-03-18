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
  process_loss_qty numeric,
  loss_notes       text,
  planned_date     date,
  started_at       timestamptz,
  completed_at     timestamptz,
  operator         text,
  notes            text,
  -- Batchlog-skabelon fields (SOP-03 compliance)
  blanching_temp      numeric,
  blanching_time_secs integer,
  oil_temp            numeric,
  filtration_ok       boolean,
  best_before         date,
  sensory_eval        jsonb,
  operator_confirmed  boolean   not null default false,
  -- Shopify integration: release gate
  released_at      timestamptz,
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
  -- Receiving control status (SOP-04)
  receiving_status text        not null default 'godkendt'
                               check (receiving_status in ('godkendt','karantaene','afvist')),
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
                                 'note','recalled','released'
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

-- Salgbar beholdning per færdigvare.
-- Kun produce-bevægelser fra frigivne batches tæller.
-- Waste, adjustment, return medregnes altid.
create or replace view sellable_stock as
  select
    im.item_id,
    sum(im.qty)                   as sellable_qty,
    count(distinct case
      when im.movement_type = 'produce' then im.batch_id
    end)                          as released_batch_count
  from inventory_movements im
  left join batches b on b.id = im.batch_id
  where
    im.item_id in (
      select distinct item_id from inventory_movements
      where movement_type = 'produce'
    )
    and im.movement_type in ('produce','waste','adjustment','return')
    and (
      im.movement_type != 'produce'
      or b.released_at is not null
    )
  group by im.item_id;


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


-- ─── ATOMIC LOT DECREMENT ───
-- Atomically decrements qty_remaining on a lot.
-- Fails if insufficient stock. Called via supabase.rpc('decrement_lot_qty', ...).
create or replace function decrement_lot_qty(p_lot_id uuid, p_qty numeric)
returns numeric as $$
declare
  v_remaining numeric;
begin
  if p_qty is null or p_qty <= 0 then
    raise exception 'Ugyldigt antal: skal være større end 0';
  end if;

  update lots
    set qty_remaining = qty_remaining - p_qty
    where id = p_lot_id
      and qty_remaining >= p_qty
  returning qty_remaining into v_remaining;

  if not found then
    -- Fetch actual remaining for the error message
    select qty_remaining into v_remaining from lots where id = p_lot_id;
    if v_remaining is null then
      raise exception 'Lot ikke fundet: %', p_lot_id;
    else
      raise exception 'Ikke nok lagerbeholdning: % tilgængelig, % efterspurgt',
        v_remaining, p_qty;
    end if;
  end if;

  return v_remaining;
end;
$$ language plpgsql security definer set search_path = public;


-- ═══════════════════════════════════════════
-- DRYP Phase 2: Customers & Orders
-- SQL-backed kunder og ordrer med team RLS.
-- Kør dette i Supabase SQL Editor.
-- ═══════════════════════════════════════════


-- ───────────────────────────────────────────
-- CUSTOMERS
-- Kundedatabase. Delt mellem alle team-
-- medlemmer via is_team_member() RLS.
-- ───────────────────────────────────────────
create table if not exists customers (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  type          text        check (type in ('restaurant','delikatesse','detail','engros')),
  contact       text,
  email         text,
  phone         text,
  status        text        not null default 'lead'
                            check (status in ('lead','prøve','aktiv','inaktiv')),
  notes         text,
  created_by    uuid        references auth.users(id),
  updated_by    uuid        references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists customers_name_idx on customers (name);
create index if not exists customers_status_idx on customers (status);

alter table customers enable row level security;

create policy "Team can view customers"
  on customers for select using (is_team_member());
create policy "Team can insert customers"
  on customers for insert with check (is_team_member());
create policy "Team can update customers"
  on customers for update using (is_team_member());
create policy "Team can delete customers"
  on customers for delete using (is_team_member());


-- ───────────────────────────────────────────
-- ORDERS
-- Ordrer knyttet til kunder. batch_ref er en
-- løs tekst-reference til en batch (ikke FK).
-- ───────────────────────────────────────────
create table if not exists orders (
  id              uuid        primary key default gen_random_uuid(),
  customer_id     uuid        references customers(id) on delete set null,
  order_date      date,
  delivery_date   date,
  product         text,
  qty             integer,
  price           numeric,
  batch_ref       text,
  status          text        not null default 'ny'
                              check (status in ('ny','bekraeftet','produktion','levering','leveret','fakturaklar','faktureret')),
  customer_ref    text,
  internal_note   text,
  customer_note   text,
  -- Shopify integration fields
  source          text        not null default 'manual',
  external_order_id text,
  created_by      uuid        references auth.users(id),
  updated_by      uuid        references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists orders_customer_id_idx on orders (customer_id);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_delivery_date_idx on orders (delivery_date);
create index if not exists orders_order_date_idx on orders (order_date desc);

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check
  CHECK (source IN ('manual','shopify'));

CREATE UNIQUE INDEX IF NOT EXISTS orders_external_order_unique
  ON orders (source, external_order_id)
  WHERE external_order_id IS NOT NULL;

alter table orders enable row level security;

create policy "Team can view orders"
  on orders for select using (is_team_member());
create policy "Team can insert orders"
  on orders for insert with check (is_team_member());
create policy "Team can update orders"
  on orders for update using (is_team_member());
create policy "Team can delete orders"
  on orders for delete using (is_team_member());


-- ─── AUTO-UPDATE TIMESTAMPS ───
-- Reuse the existing update_team_data_timestamp pattern
-- but create a generic trigger function for updated_at.
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger customers_updated_at
  before update on customers
  for each row
  execute function update_updated_at();

create trigger orders_updated_at
  before update on orders
  for each row
  execute function update_updated_at();


-- ═══════════════════════════════════════════
-- DRYP Phase 3: Batch Log Hardening
-- Adds batchlog-skabelon fields required by
-- SOP-03 for compliance-ready batch records.
-- Run on live DB where batches table already exists.
-- ═══════════════════════════════════════════
ALTER TABLE batches ADD COLUMN IF NOT EXISTS blanching_temp numeric;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS blanching_time_secs integer;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS oil_temp numeric;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS filtration_ok boolean;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS best_before date;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS sensory_eval jsonb;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS operator_confirmed boolean not null default false;


-- ═══════════════════════════════════════════
-- DRYP Phase 4: Shopify Integration Foundation
-- Adds batch release gate, order source tracking,
-- and sellable stock view.
-- Run on live DB where tables already exist.
-- ═══════════════════════════════════════════

-- Batch release
ALTER TABLE batches ADD COLUMN IF NOT EXISTS released_at timestamptz;

-- Batch events: add 'released' event type
ALTER TABLE batch_events DROP CONSTRAINT IF EXISTS batch_events_event_type_check;
ALTER TABLE batch_events ADD CONSTRAINT batch_events_event_type_check
  CHECK (event_type IN (
    'created','started','step_completed',
    'ccp_recorded','completed','deviation',
    'note','recalled','released'
  ));

-- Order webshop fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_source_check;
ALTER TABLE orders ADD CONSTRAINT orders_source_check
  CHECK (source IN ('manual','shopify'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_external_order_unique
  ON orders (source, external_order_id)
  WHERE external_order_id IS NOT NULL;


-- ═══════════════════════════════════════════
-- DRYP Phase 5: Unified Receiving Control
-- Adds receiving_status to lots for SOP-04
-- compliance. Godkendt/Karantæne/Afvist.
-- Run on live DB where lots table already exists.
-- ═══════════════════════════════════════════
ALTER TABLE lots ADD COLUMN IF NOT EXISTS receiving_status text NOT NULL DEFAULT 'godkendt';
ALTER TABLE lots DROP CONSTRAINT IF EXISTS lots_receiving_status_check;
ALTER TABLE lots ADD CONSTRAINT lots_receiving_status_check
  CHECK (receiving_status IN ('godkendt','karantaene','afvist'));
