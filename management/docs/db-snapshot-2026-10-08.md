# Supabase DB snapshot — 2026-10-08

Project: `meglqtllvjadabwzaimz` ("love-cleaning-management-portal")

Taken right after adding `buildings`/`building_cleaners` and backfilling `units.building_id`, before deciding whether/how to retire `property_building` text columns from `units`/`jobs`.

## Tables and row counts

| Table | Rows | RLS |
|---|---|---|
| `staff` | 1 | enabled, no policies (deny-all to anon/auth) |
| `customers` | 1 | enabled, no policies |
| `buildings` | 1 | enabled, no policies (just fixed — was disabled until this snapshot) |
| `building_cleaners` | 0 | enabled, no policies (just fixed — was disabled until this snapshot) |
| `units` | 6 | enabled, no policies |
| `jobs` | 56 | enabled, no policies |
| `bundles` | 0 | enabled, no policies |
| `reports` | 0 | enabled, no policies |
| `access_links` | 0 | enabled, no policies |

All "no policies" tables are intentionally deny-all for the anon/publishable key — every read/write in the app goes through a service-role client. This is informational per Supabase's own advisor, not a gap.

## Schema (public)

### `staff`
`id` uuid PK · `staff_id` text unique nullable · `name` text · `mobile` text · `pin` text · `email` text · `outlook_email` text · `service_areas` text · `maximum_daily_hours` numeric · `hourly_rate` numeric · `show_prices` bool default false · `airbnb_qualified` bool default false · `active` bool default true · `completed_units` int4 · `notes` text · `created_at` timestamptz default now() · `is_admin` bool default false · `taking_new_work` bool default true · `new_job_alerts` bool default true

Referenced by: `reports.staff_id`, `jobs.assigned_staff_id`, `bundles.assigned_staff_id`, `building_cleaners.staff_id`, `access_links.staff_id`

Real rows: "COO Eddy" (test number, 780-850-0235), "Lydia" (real cleaner, disabled in dispatch workflow pending verification).

### `customers`
`id` uuid PK · `name` text · `mobile` text · `pin` text · `email` text · `active` bool default true · `created_at` timestamptz default now()

Referenced by: `buildings.customer_id`, `units.customer_id` (legacy, see below), `access_links.customer_id`

Real rows: "Caitlyn Bruening" (name only — no mobile/email on file yet, needs filling in).

### `buildings` (new)
`id` uuid PK · `name` text unique · `address` text · `area` text · `customer_id` uuid FK → `customers.id` · `created_at` timestamptz default now()

Referenced by: `building_cleaners.building_id`, `units.building_id`

Real rows: "Macewan B&B" (Edmonton, owned by Caitlyn Bruening).

### `building_cleaners` (new, empty)
`id` uuid PK · `building_id` uuid FK → `buildings.id` · `staff_id` uuid FK → `staff.id` · `role` text default 'primary', check in ('primary','backup') · `created_at` timestamptz default now() · unique (`building_id`, `staff_id`)

Intended replacement for any unit-level cleaner assignment — a cleaner assigned here covers every unit/job at that building.

### `units`
`id` uuid PK · `unit_id` text unique nullable (natural key from n8n sync) · `unit_name` text · `property_building` text **← legacy, not yet dropped, still live-written by n8n** · `client` text · `address` text · `area` text · `active` bool default true · `room_state` text · `cleaning_status` text · `current_stay_checkout` timestamptz · `next_check_in` timestamptz · `last_clean` timestamptz · `last_completed_job_id` uuid (not FK-enforced) · `assigned_cleaner` text (not FK-enforced) · `expected_hours` numeric · `cleaner_pay` numeric · `checkout_time` text · `check_in_time` text · `access_instructions` text · `important_notes` text · `special_requirements` text · `created_at` timestamptz default now() · `airbnb_ical_url` text · `dirty_since` timestamptz · `last_checkout` timestamptz · `customer_id` uuid FK → `customers.id` (now redundant with `buildings.customer_id` — see open question below) · `clean_by_days_before_checkout` int4 · `building_id` uuid FK → `buildings.id` (new, backfilled on all 6 rows)

Referenced by: `jobs.unit_id`

All 6 real rows now have `building_id` set to the Macewan B&B building. `customer_id` is still null on all 6 (never was populated) — owner relationship now correctly lives on `buildings.customer_id` instead per this session's decision.

### `jobs`
`id` uuid PK · `job_id` int4 · `job_key` text unique (conflict target for n8n upsert) · `unit_id` uuid FK → `units.id`, nullable · `client` text · `property_building` text **← legacy, still live-written by n8n AND read by the live dispatch workflow (QAYKafRjWcZU6LMi) for SMS formatting** · `address` text · `area` text · `checkout_date` date · `checkout_time` text · `next_check_in_date` date · `check_in_time` text · `earliest_clean_date` date · `latest_clean_date` date · `expected_hours` numeric · `cleaner_pay` numeric · `turnover_type` text · `priority` text · `status` text default 'Open' · `bundle_id` uuid FK → `bundles.id` · `assigned_staff_id` uuid FK → `staff.id` · `assigned_cleaner` text (not FK-enforced) · `source` text · `claimed_at`/`completed_at`/`cancelled_at` timestamptz · `notes` text · `created_at` timestamptz default now() · `airbnb_uid` text · `outlook_event_id` text · `carry_forward` bool default false (always false in practice — never actually computed by the sync)

Referenced by: `reports.job_id`, `access_links.job_id`

56 rows, actively growing via n8n every 2h. One known historical data-quality issue (see Known issues below).

### `bundles`
`id` uuid PK · `bundle_id` int4 · `bundle_key` text unique · `area` text · `property_building` text (legacy, same pattern) · `scheduled_date` date · `units_count` int4 · `expected_hours` numeric · `total_cleaner_pay` numeric · `assigned_staff_id` uuid FK → `staff.id` · `assigned_cleaner` text · `status` text · `published_at`/`claimed_at` timestamptz · `notes` text · `created_at` timestamptz default now()

0 rows. Feeds the Job Bundling workflow, which is currently **deactivated** (paused this session — bundling/routes explicitly out of scope for the V1 pilot).

### `reports`
`id` uuid PK · `description` text · `category` text · `job_id` uuid FK → `jobs.id` · `staff_id` uuid FK → `staff.id` · `status` text default 'New' · `created_at` timestamptz default now()

0 rows.

### `access_links` (new, empty)
`id` uuid PK · `token_hash` text unique · `persona` text, check in ('cleaner','owner') · `staff_id` uuid FK → `staff.id`, nullable · `customer_id` uuid FK → `customers.id`, nullable · `job_id` uuid FK → `jobs.id`, nullable · `expires_at` timestamptz · `revoked_at` timestamptz nullable · `used_at` timestamptz nullable · `created_at` timestamptz default now()

Built but not wired up yet — the pilot cleaner page (`/pilot/job/[token]`) currently reads from hardcoded fake data (`lib/pilot/fake-data.ts`), not this table.

## Open questions / not yet decided

1. **`units.property_building` and `jobs.property_building`** — still present, still written by the live n8n sync workflow (`vLqEncMURiYDUkhh`) and still read by the live dispatch workflow (`QAYKafRjWcZU6LMi`) for SMS text formatting. User decided to fully replace these (not keep as denormalized text) but that requires updating the dispatch workflow's query + formatter first, verified working, before the columns can be safely dropped — paused mid-migration to prioritize finishing Step 1 (cleaner magic-link page) first.
2. **`units.customer_id` vs `buildings.customer_id`** — now redundant now that owner lives on buildings. Not yet decided whether to drop `units.customer_id` or leave it (currently null everywhere, unused).
3. **`building_cleaners` is empty** — no cleaner-to-building assignment exists yet for the real building/staff. Needs at least one row before the pilot cleaner page can read real (non-fake) assignments.

## Known issues (pre-existing, found this session, not yet fixed)

- One `jobs` row has `completed_at` set but `status` still `'Ready'` — inconsistent manual fix from an earlier incident (Oct 5), not cleaned up.
- The Airbnb sync previously had no cancellation-detection (a cancelled booking's job row stayed open forever). A fix was built and logic-tested in a throwaway test-copy workflow this session, then ported into `vLqEncMURiYDUkhh` as an unpublished draft version — **not yet activated**.
