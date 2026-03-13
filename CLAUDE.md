# CLAUDE.md

# DRYP – Claude Code Project Guide

This file provides guidance to Claude Code when working with this repository.

DRYP is an internal production system for a small Danish food business in Skagen.
The primary use case is small-batch food production, traceability, inventory control, and operator-friendly workflows.

This is not a generic SaaS dashboard.
It is an operational tool for real food production work.

---

## Commands

```bash
npm run dev
npm run build
npm run start
```

No test runner or linter is configured.

## Environment

Copy .env.local.example to .env.local and fill in Supabase credentials.

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Run `supabase-setup.sql` in the Supabase SQL Editor to create the required tables.

Important tables include:
- app_data
- weekly_archives
- batches
- lots
- batch_lot_usage
- inventory_movements

## Architecture

This is a Next.js 14 App Router application.

The UI language is Danish.

Data flow

Historically, most application state lived in a JSON blob stored in Supabase table app_data.

The root page (app/page.js) loads this blob on mount and exposes:
	•	update(key, value)
	•	save(newData)

These are passed into components/DrypApp.js.

Current migration state

The app is currently in a gradual migration from JSON blob storage to more structured Supabase tables.

Important SQL-backed entities now include:
	•	batches
	•	lots
	•	batch_lot_usage
	•	inventory_movements
	•	batch_events

This means both systems may coexist temporarily:
	•	legacy JSON data for existing flows
	•	SQL-backed flows for newer operational features

When modifying the app, prefer safe bridging over risky rewrites.

### Data flow

Typical JSON structure in app_data includes:

data = {
  recipes,      // Product recipes with BOM and HACCP steps
  productions,  // Production run records
  batches,      // Legacy batch tracking
  customers,    // Customer list
  orders,       // Orders linked to customers
  inventory,    // Ingredient/packaging stock levels with min thresholds
  haccp,        // HACCP log entries
  prices,       // Retail/wholesale prices and overhead
  team          // Internal wiki pages and messages
}
This legacy structure still exists and should not be broken casually.

### Data shape (defaults defined in `app/page.js`)

```
data = {
  recipes      // Product recipes with BOM (bill of materials) and HACCP steps
  productions  // Production run records
  batches      // Batch tracking
  customers    // Customer list
  orders       // Orders linked to customers
  inventory    // Ingredient/packaging stock levels with min thresholds
  haccp        // HACCP log entries (cleaning, temps, deviations, receiving, maintenance)
  prices       // Retail/wholesale prices and overhead
  team         // Internal wiki pages and messages
}
```

### Component structure

Component structure

components/DrypApp.js is currently the main UI container.

It contains:
	•	the main app shell
	•	sidebar navigation
	•	page-level modules
	•	shared mini UI components
	•	theme object T

Main page modules currently include:
	•	Dashboard
	•	Recipes
	•	Production
	•	HACCPLogs
	•	Batches
	•	Customers
	•	Inventory
	•	Planning
	•	Economy
	•	Team

This file is large and should be modified carefully.


### Auth
	•	middleware.js protects authenticated routes
	•	lib/supabase.js is the browser client
	•	lib/supabase-server.js is the server client
	•	app/login/page.js handles login/signup

When SQL inserts require user_id, always fetch the authenticated user explicitly if needed.

⸻

### Styling

The UI primarily uses inline styles.

The theme object T in DrypApp.js is the main source of truth for:
	•	colors
	•	fonts
	•	spacing conventions
	•	visual tokens

Tailwind exists but is not used for most component styling.

Do not introduce a parallel styling system unless explicitly requested.

Business context

DRYP is used by a small food production company.

Typical batch size:
	•	50–100 bottles

Important product context:
	•	recipes are almost finalized
	•	the system must support creating new recipes over time
	•	the system must support creating new products from different raw materials
	•	often the 250ml and 500ml versions share the same base recipe and differ mainly in bottling / packaging

This is a small-system context, not a heavy ERP.

Core domain rules

Batches

A batch is the central production entity.

Each batch should remain linked to:
	•	recipe
	•	operator
	•	planned date
	•	production status
	•	raw material lot usage
	•	actual output
	•	future event timeline

Never break batch traceability.

Lots

Lots are required for raw material traceability.

Lots should support:
	•	quantity received
	•	quantity remaining
	•	unit
	•	received date
	•	optional expiry date
	•	optional supplier

Lots should only be selectable for relevant recipes / raw materials.

Inventory

Inventory should not change silently.

Meaningful stock changes should ideally create an inventory movement record.

Examples:
	•	receipt
	•	consumption
	•	adjustment
	•	waste
	•	return
	•	produce

Recipes

Recipes represent production knowledge.

They should eventually support:
	•	lifecycle (draft / test / approved)
	•	versioning
	•	product development
	•	microbial validation reminders

Recipes may later be separated into:
	•	base recipe
	•	packaging / product variant

because 250ml and 500ml often share the same production base.

⸻

UX principles

This system is used in real production work.

Always prefer:
	•	clear workflows
	•	fewer decisions per screen
	•	large click / tap targets
	•	plain Danish labels
	•	obvious next steps
	•	contextual help where confusion is likely
	•	operational clarity over cleverness

Avoid:
	•	exposing raw database concepts unnecessarily
	•	dense modals with mixed concerns
	•	mixing overview, action, and traceability in one unclear section
	•	redesigning everything at once

If the app becomes more technically correct but less intuitive, propose a UX correction instead of continuing blindly.

Development workflow rules

Plan-first rule

Before making any non-trivial change:
	1.	State the goal
	2.	List exact files to change
	3.	Explain logic changes
	4.	Explain UI changes
	5.	Explain what stays untouched
	6.	List risks
	7.	Provide manual test steps

Do not edit until the plan is approved.

Commit rule

Before committing:
	•	summarize exactly what changed
	•	list all modified files
	•	list manual test steps
	•	state whether backend logic changed

Scope rule

Prefer:
	•	small
	•	incremental
	•	low-risk changes

Avoid mixing multiple large concerns in one change.

Safety rule

Do not:
	•	rewrite the entire app in one step
	•	change database schema unless explicitly requested
	•	remove working backend logic casually
	•	break legacy JSON flows without a migration path

Prefer bridging and progressive migration.

⸻

Current product direction

Near-term priorities:
	1.	Make lot creation easy from Inventory
	2.	Improve batch workflow usability
	3.	Connect production → lot usage → actual output
	4.	Improve dashboard clarity
	5.	Add contextual help / guidance
	6.	Reduce confusion by moving from section-based UI toward task-based workflows

Later priorities:
	•	recipe versioning
	•	microbial validation reminders
	•	product development workflows
	•	batch events / timeline
	•	stronger release / hold / QA flows

⸻

Current UX strategy

The app is gradually moving from a section-based UI to a task-based workflow.

That means future improvements should prioritize:
	•	“Hvad skal jeg gøre nu?”
	•	“Hvad er i gang?”
	•	“Hvad mangler?”
	•	“Hvad er næste skridt?”

over static data presentation.

Dashboard and batch workflows should evolve in that direction.

⸻

Operator-facing language

Prefer Danish operator-friendly labels over technical/internal jargon.

Examples:
	•	use Danish status labels in UI
	•	explain unclear concepts with small contextual help text or ? icons
	•	use empty states to guide action, not just state absence

⸻

When uncertain

If a change risks:
	•	breaking traceability
	•	confusing operators
	•	corrupting inventory logic
	•	creating a larger refactor than requested

Stop and propose a safer phased alternative first.

## Code editing rule

Never rewrite large files unless explicitly asked.

This repository contains large single-file UI modules (especially DrypApp.js).

When modifying code:
- prefer minimal targeted edits
- avoid large refactors
- preserve working logic
- do not redesign the UI structure unless requested

Always explain changes before editing.
