# Live state inspection — 2026-10-26 (plan step S0.1)

Read-only inspection through the Supabase and n8n MCP servers. Nothing was changed.

## Supabase — project `meglqtllvjadabwzaimz` (love-cleaning-management-portal), ACTIVE_HEALTHY

(A second project, `welred`, is INACTIVE and unrelated.)

**RLS / policies (confirms the code comment in `lib/pilot/supabase.ts`, contradicts the 2026-10-08 snapshot doc):**
- RLS is enabled on all 9 public tables, but **each has one policy named "app access" for role `public`, command ALL, `using true / with check true`**: `access_links`, `building_cleaners`, `buildings`, `bundles`, `customers`, `jobs`, `reports`, `staff`, `units`.
- `storage.objects` has an "app access" policy for `public` scoped to bucket `report-photos` (ALL).
- Consequence: anyone with the publishable key can read and write every table, including `staff` (names, mobiles, PINs) and `customers`. The security advisor returns no lints because the policies technically exist.
- The publishable key is hard-coded in the n8n dispatch workflow's HTTP nodes (visible to anyone with n8n access), in addition to being embedded in the app.

**Storage:** bucket `report-photos` is **public** (`public = true`). The plan's "make photos private" work is required.

**Row counts now:** `access_links` 2, `jobs` 69, `reports` 0, `building_cleaners` 1, `staff` 2, `customers` 1.
`access_links` now has 2 rows, so at least one cleaner token link has been issued since the 10-08 snapshot.

## n8n workflows

| Workflow | Active | Notes |
|---|---|---|
| `LCP - Nightly Airbnb Sync (Units + Jobs)` `vLqEncMURiYDUkhh` | **yes** | every 2h 7am–11pm; updated 2026-10-08 |
| `LCP - Job Dispatch (Morning / Evening)` `QAYKafRjWcZU6LMi` | **yes** | 7:00 and 18:00 |
| `LCP - Nightly Airbnb Sync (TEST COPY)` `VZEGgQGQzR7VHw79` | no | test copy |
| `LCP Pilot - Test Cleaner Link SMS` `cWbi6WfgmN15NTYB` | no | not inspected |
| `LCP - Nightly Job Bundling & Staff Offer` `Z2TFQddIGWYzeUo7` | no | paused |

**Dispatch workflow (`QAYKafRjWcZU6LMi`):**
- Reads `jobs` and `staff` from Supabase REST using the **publishable key** pasted into `Authorization` headers (not a credential). It still selects the legacy `property_building` column.
- Builds one **digest** message per run (today's and tomorrow's cleans grouped by property) and sends it through the **OpenPhone (Quo) API** (`POST https://api.openphone.com/v1/messages`, from `+15874047577`) to **every** staff row with `active`, `taking_new_work`, `new_job_alerts` and a mobile.
- **It contains no job links and no per-job or per-cleaner messages.** No SMS today embeds `/pilot/job/<token>`, so no live message depends on token URLs.
- There is no "new job created" notification path. The plan's `job_created` / `special_request` flows are new workflows, not changes to this one.
- The sticky note says the OpenPhone sends were meant to go only to test placeholders; as deployed, the HTTP send nodes target all matching staff. Confirm this is intended before relying on it (only 2 staff rows exist).

**Sync workflow (`vLqEncMURiYDUkhh`):**
- Uses Supabase REST through header-auth credentials for units/jobs (upserts keyed on `job_key`, `airbnb_uid` per iCal event, `source` set from the parser). Still contains **disabled Airtable nodes**; safe to delete from the workflow.
- The orphan-cancellation logic (cancel an open job whose `airbnb_uid` is missing from the live iCal feed) exists in the **draft** version (`versionId 563c82b1…`) but **not in the active version** (`activeVersionId 8dc1492f…`, no "Orphan" nodes). It is still unpublished.
- That logic only cancels rows that **have an `airbnb_uid`** that is absent from the feed, so a manual job with `airbnb_uid = null` would not be cancelled. It does not filter by `source`, so before publishing, add `source = airbnb` (or `neq.owner_manual`) to the "Get Open Jobs For Unit" query as defense in depth.
- Its upsert writes by `job_key`; manual jobs use `job_key = 'owner_manual:<uuid>'`, which cannot collide with sync keys.

## Not verified
- Which credential values the n8n header-auth credentials hold (n8n does not expose them); the dispatch HTTP nodes demonstrably use the publishable key inline. Assume the sync credentials are also the publishable key until checked in the n8n UI.
- Whether the `report-photos` bucket contains any objects.
- Contents of `LCP Pilot - Test Cleaner Link SMS`.
