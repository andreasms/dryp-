# DRYP Supabase Setup Audit

**Date:** 2026-03-15

---

## 1. Current setup summary

| Category | Status |
|----------|--------|
| Supabase JS client | `@supabase/supabase-js` ^2.45.0, `@supabase/ssr` ^0.5.0 |
| Supabase CLI | `supabase` ^2.78.1 (devDependency), confirmed working |
| `supabase/` folder | **Does not exist** — no `config.toml`, no `migrations/`, no `seed.sql` |
| Schema source of truth | `supabase-setup.sql` (572 lines, monolithic, no versioning) |
| Env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (both public) |
| Client creation | `lib/supabase.js` (browser), `lib/supabase-server.js` (server/middleware) |
| Auth | Supabase Auth via middleware redirect + `is_team_member()` RLS |
| DB access layer | 8 modules in `lib/db/` — thin query wrappers, one RPC call |

**Bottom line:** The CLI is installed but has never been initialized. All database changes are applied by manually running SQL in the Supabase SQL Editor. There is no migration history, no local dev database, no diffing capability.

---

## 2. What exists in repo

### Tables (12)

`team_members`, `team_data`, `weekly_archives`, `batches`, `lots`, `inventory_movements`, `batch_events`, `batch_lot_usage`, `haccp_logs`, `wiki_pages`, `team_messages`

(Plus legacy `app_data` referenced in migration comments only.)

### Views (2)

`stock_levels` — `SUM(qty)` from `inventory_movements` grouped by `(user_id, item_id)`
`active_lots` — lots with `qty_remaining > 0`, includes `expiry_status`

### Functions (3)

| Function | Type | Security |
|----------|------|----------|
| `update_team_data_timestamp()` | Trigger function | — |
| `is_team_member()` | Auth helper | `SECURITY DEFINER STABLE` |
| `decrement_lot_qty(p_lot_id, p_qty)` | Atomic lot decrement | `SECURITY DEFINER`, `search_path = public` |

### RLS

All operational tables have RLS enabled. Team-based policies via `is_team_member()`.

### Indexes

17 indexes across all operational tables.

### lib/db/ modules (8)

| Module | Tables / RPCs used |
|--------|-------------------|
| `batches.js` | `batches` |
| `batchEvents.js` | `batch_events` |
| `movements.js` | `inventory_movements`, `stock_levels` (view) |
| `batchLotUsage.js` | `batch_lot_usage` + join to `lots` |
| `lots.js` | `lots`, RPC `decrement_lot_qty` |
| `haccpLogs.js` | `haccp_logs` |
| `wikiPages.js` | `wiki_pages` |
| `teamMessages.js` | `team_messages` |

---

## 3. What seems to exist only in live Supabase

These items are defined in `supabase-setup.sql` and referenced in code, but **there is no mechanism to verify they match what is actually deployed:**

- The `decrement_lot_qty` RPC — added to the repo file but must be manually run in the SQL Editor. If it hasn't been run yet, `decrementLotQty()` in `lots.js` will fail at runtime.
- All RLS policies — if the SQL Editor was used to add/modify policies outside of `supabase-setup.sql`, the repo won't reflect it.
- Any column modifications, constraint changes, or ad-hoc fixes applied directly in the dashboard.

**There is no way to detect drift between the repo's SQL file and the live database.** The file is meant to be run once (or re-run idempotently in parts), but there is no diffing, no migration tracking, and no `supabase db diff` capability since the CLI isn't initialized.

---

## 4. Risks

| Risk | Severity | Detail |
|------|----------|--------|
| **Schema drift** | High | No migration tool. Repo SQL and live DB can silently diverge. Any manual SQL Editor change is untracked. |
| **No local dev DB** | Medium | All development hits the remote Supabase instance directly. No way to test schema changes safely. |
| **No migration history** | Medium | `supabase-setup.sql` is a single file with 3 phases concatenated. Cannot tell which parts have been applied. |
| **New RPC may not be deployed** | High | `decrement_lot_qty` was added to the repo file but requires manual deployment. If forgotten, lot usage will break in production. |
| **No server-side secret key** | Low | Only the anon key is configured. This is fine for the current RLS-based architecture but limits future server-side capabilities. |
| **Monolithic SQL file** | Low | 572 lines in one file. Manageable now, but adding more functions/tables increases merge risk. |

---

## 5. Verdict

**Good enough to continue implementation — but with one mandatory action.**

The current setup (monolithic SQL file + manual deployment) is acceptable for a 3-person team with a small schema. The RLS is solid, the db access layer is clean, and the codebase is consistent.

However:

- The `decrement_lot_qty` RPC **must be deployed to the live database** before the updated `lots.js` goes to production. This is a hard prerequisite.
- The batch completion hardening change (already applied in the repo) is pure client-side logic and has no SQL dependency — it is safe to ship.

Setting up `supabase init` + migrations would be a genuine improvement, but it is **not blocking** the current implementation work. It can be done as a separate hygiene step.

---

## 6. Recommended next step

1. **Now:** Deploy `decrement_lot_qty` to live Supabase (run the SQL function in the SQL Editor). This unblocks the lot decrement fix already in the repo.
2. **Now:** Commit the batch completion hardening + atomic lot decrement changes (both are ready).
3. **Soon (separate task):** Run `npx supabase init` and `npx supabase db diff` to bootstrap a proper migration workflow. This would give you:
   - A `supabase/` folder with `config.toml`
   - A `migrations/` folder for versioned SQL changes
   - The ability to `supabase db diff` to detect drift
   - A local dev database option

Do not block current implementation work on the migration setup.
