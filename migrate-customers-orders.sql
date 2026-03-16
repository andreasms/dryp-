-- ═══════════════════════════════════════════
-- DRYP: One-time migration of Customers & Orders
-- from JSON blob (team_data) to SQL tables.
--
-- Run this AFTER the customers/orders tables
-- have been created (see supabase-setup.sql).
--
-- Safe to run multiple times — skips rows
-- that already exist (matched by name for
-- customers, by order_date+product+qty for orders).
-- ═══════════════════════════════════════════

-- Step 1: Migrate customers
-- Creates a temp mapping table so orders can
-- reference the new customer UUIDs.
DO $$
DECLARE
  blob jsonb;
  c jsonb;
  new_id uuid;
BEGIN
  SELECT data INTO blob FROM team_data WHERE team_id = 'dryp';
  IF blob IS NULL OR blob->'customers' IS NULL THEN
    RAISE NOTICE 'No customers found in JSON blob — skipping.';
    RETURN;
  END IF;

  -- Create temp table for old_id → new_id mapping
  CREATE TEMP TABLE IF NOT EXISTS _cust_map (
    old_id text PRIMARY KEY,
    new_id uuid NOT NULL
  );

  FOR c IN SELECT jsonb_array_elements(blob->'customers')
  LOOP
    -- Skip if customer with same name already exists
    IF EXISTS (SELECT 1 FROM customers WHERE name = c->>'name') THEN
      -- Still record the mapping for order migration
      SELECT id INTO new_id FROM customers WHERE name = c->>'name' LIMIT 1;
      INSERT INTO _cust_map (old_id, new_id) VALUES (c->>'id', new_id) ON CONFLICT DO NOTHING;
      CONTINUE;
    END IF;

    INSERT INTO customers (name, type, contact, email, phone, status, notes, created_at)
    VALUES (
      c->>'name',
      c->>'type',
      NULLIF(c->>'contact', ''),
      NULLIF(c->>'email', ''),
      NULLIF(c->>'phone', ''),
      COALESCE(c->>'status', 'lead'),
      NULLIF(c->>'notes', ''),
      COALESCE((c->>'created')::timestamptz, now())
    )
    RETURNING id INTO new_id;

    INSERT INTO _cust_map (old_id, new_id) VALUES (c->>'id', new_id) ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Migrated customer: %', c->>'name';
  END LOOP;
END $$;


-- Step 2: Migrate orders
DO $$
DECLARE
  blob jsonb;
  o jsonb;
  mapped_cust_id uuid;
  normalized_status text;
BEGIN
  SELECT data INTO blob FROM team_data WHERE team_id = 'dryp';
  IF blob IS NULL OR blob->'orders' IS NULL THEN
    RAISE NOTICE 'No orders found in JSON blob — skipping.';
    RETURN;
  END IF;

  FOR o IN SELECT jsonb_array_elements(blob->'orders')
  LOOP
    -- Look up new customer UUID from mapping
    SELECT new_id INTO mapped_cust_id
    FROM _cust_map
    WHERE old_id = o->>'customerId';

    -- Normalize legacy statuses
    normalized_status := CASE o->>'status'
      WHEN 'bestilt' THEN 'bekraeftet'
      WHEN 'pakket' THEN 'levering'
      ELSE COALESCE(o->>'status', 'ny')
    END;

    -- Skip if an order with same date+product+qty already exists for this customer
    IF EXISTS (
      SELECT 1 FROM orders
      WHERE customer_id IS NOT DISTINCT FROM mapped_cust_id
        AND order_date = (o->>'date')::date
        AND product = o->>'product'
        AND qty = (o->>'qty')::integer
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO orders (
      customer_id, order_date, delivery_date, product, qty, price,
      batch_ref, status, customer_ref, internal_note, customer_note
    ) VALUES (
      mapped_cust_id,
      NULLIF(o->>'date', '')::date,
      NULLIF(o->>'deliveryDate', '')::date,
      o->>'product',
      (o->>'qty')::integer,
      (o->>'price')::numeric,
      NULLIF(o->>'batchId', ''),
      normalized_status,
      NULLIF(o->>'customerRef', ''),
      NULLIF(o->>'internalNote', ''),
      NULLIF(o->>'customerNote', '')
    );

    RAISE NOTICE 'Migrated order: % × % for customer %', o->>'product', o->>'qty', o->>'customerId';
  END LOOP;
END $$;


-- Cleanup
DROP TABLE IF EXISTS _cust_map;

-- Done. Verify:
SELECT 'customers' AS table_name, count(*) FROM customers
UNION ALL
SELECT 'orders', count(*) FROM orders;
