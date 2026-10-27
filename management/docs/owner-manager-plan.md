# Owner + Manager roles — FINAL implementation plan (v3)

Audience: an engineer (or smaller model) implementing this end to end. Follow the steps in order. Each step lists **Files**, **Do**, and **Done when**. Do not skip "Done when".

Branch: `feat/owner-manager-roles` (from `main` @ `27a01b69`). App root: `management/` (all paths below are relative to it).

## 0. Ground rules

1. **Read first**: `AGENTS.md` says this Next.js (16.3) differs from what you know. Before writing any code that touches routing, `cookies()`, server actions, redirects or `proxy`, read the matching guide in `node_modules/next/dist/docs/01-app/`. `cookies()` and `params` are async in this version.
2. **Verify every step** with `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test` (added in S1.1) and `pnpm build`. Fix before moving on. Commit after each step (small conventional commits).
3. **Authorization is checked in every server action and every data query**, not only in layouts (layouts do not re-run on client navigation). A valid session is never enough; check the specific building/job.
4. **Fake mode** (`PILOT_USE_FAKE_DATA`, default true) must keep working: every new query/action gets a fake twin in `lib/pilot/fake-store.ts` so the UI is developable without Supabase. Fake mode must be impossible when `PILOT_USE_FAKE_DATA=false`.
5. **Never log** codes, device tokens, phone numbers in full, access instructions or guest info. No `console.log` of request bodies in auth code.
6. **STOP and ask the human (Eddy)** before: applying any migration to the live Supabase project, changing any n8n workflow/credential, changing production env vars, `git push`, deleting data, or anything marked **[HUMAN]**. Write the SQL/spec, hand it over, and continue with work that doesn't depend on it.
7. The existing cleaner flow (n8n sync → dispatch SMS → open link → accept → complete → report) is the **regression baseline** and must keep working until the human confirms cutover.

## 1. Decisions (final)

| # | Decision |
|---|---|
| D1 | One auth system for cleaners, owners, managers, admins: **SMS code + trusted device**. |
| D2 | Trusted device: server-side record, HttpOnly cookie, **30-day sliding idle window, 90-day hard cap from last SMS verification** (constants in one file, easy to change). |
| D3 | SMS job links are **non-secret** (`/pilot/j/<jobId>`), reopenable; after verification the user returns to the job. |
| D4 | Phone change by the user needs a code to the current **and** the new number. **LCP admin can change an account's phone number or issue a one-time login code** (lost phone). Both revoke existing devices where noted. |
| D5 | n8n remains the notification dispatcher (Quo SMS). Business notifications go through a `notification_outbox` (retry + dedupe). OTP codes use a fast idempotent webhook (not outbox polling). |
| D6 | Roles are additive and building-scoped. **Owner** is derived from `buildings.customer_id`; **cleaner** from `building_cleaners`; **manager** from `role_assignments`; **admin** from `staff.is_admin`. |
| D7 | Self-managed building (`buildings.management_mode='self'`): owner manages cleaners and managers. LCP-managed (`'lcp'`, default): owner views team only. |
| D8 | Price editing only for a manager grant with `can_edit_price` (or admin). Ownership never grants it. |
| D9 | One **primary manager** per building receives alerts; LCP admin is fallback. |
| D10 | Owner-created jobs are immediate, no approval. Special request → manager alert, never a scheduling delay. |
| D11 | Customer price (`jobs.price`) is separate from `cleaner_pay`. Cleaners never see price; owners never see cleaner pay. |
| D12 | The old Airtable portal is dead and is **deleted** (S0.2). |

## 2. Permission matrix (implement as a pure, unit-tested module)

| Action | Rule |
|---|---|
| `job.view` | Cleaner/owner/manager grant on the job's building, or admin |
| `job.accept` | Cleaner grant on building AND `assigned_staff_id` is null AND status in (Open, Upcoming, Ready) AND not cancelled |
| `job.complete` | Caller is the job's assigned cleaner |
| `job.updateResult` | Assigned cleaner, or manager grant on building, or admin |
| `report.create` | Assigned cleaner of that job, or manager on building, or admin (author set server-side) |
| `report.edit` / `report.delete` | Report author, or manager on building, or admin |
| `report.view`, `photo.view` | Anyone with `job.view` |
| `photo.upload` | Anyone with `report.create` on that job |
| `job.create` (manual) | Owner or manager grant on the unit's building, or admin |
| `unit.edit` | Owner or manager grant on the unit's building, or admin |
| `team.view` | Owner or manager grant on building, or admin |
| `team.edit`, `manager.assign` | (Owner AND building `management_mode='self'`), or admin |
| `price.edit` | Manager grant with `can_edit_price` on building, or admin |
| `admin.*` | `staff.is_admin` |

Owner-facing views never return `cleaner_pay`; cleaner-facing views never return `price`.

## 3. Architecture

### 3.1 Data model (SQL goes in `supabase/migrations/NNNN_name.sql` in the repo; applying to live is **[HUMAN]**; prefer testing on a Supabase dev branch first)

```sql
-- 0001_auth.sql
create table accounts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  staff_id uuid references staff(id),
  customer_id uuid references customers(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table verification_codes (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  code_hash text not null,                       -- HMAC-SHA256(AUTH_SECRET, code || id)
  purpose text not null check (purpose in ('login','change_phone_current','change_phone_new','admin_issued')),
  account_id uuid references accounts(id),       -- required for admin_issued / change_phone_*
  new_phone_e164 text,                           -- for change_phone_*
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index on verification_codes (phone_e164, created_at desc);

create table trusted_devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  token_hash text not null unique,               -- SHA-256 of the cookie token
  user_agent text,
  verified_at timestamptz not null default now(),-- last SMS verification (hard cap anchor)
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  hard_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table auth_events (                       -- audit + rate-limit source
  id uuid primary key default gen_random_uuid(),
  kind text not null,                            -- code_sent, code_failed, login_ok, device_revoked, admin_phone_change, admin_code_issued, ...
  account_id uuid references accounts(id),
  actor_account_id uuid references accounts(id),
  key text,                                      -- rate-limit key: 'phone:<hash>' or 'ip:<hash>' (hashed, never raw)
  created_at timestamptz not null default now()
);
create index on auth_events (kind, key, created_at desc);

-- 0002_roles.sql
create table role_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id),
  role text not null check (role in ('manager')),
  building_id uuid not null references buildings(id),
  can_edit_price boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (account_id, role, building_id)
);
create unique index one_primary_manager_per_building
  on role_assignments (building_id) where is_primary and revoked_at is null;

alter table buildings add column management_mode text not null default 'lcp'
  check (management_mode in ('lcp','self'));
alter table building_cleaners add column revoked_at timestamptz;   -- soft remove; queries must filter revoked_at is null

-- 0003_jobs_pricing.sql
alter table units add column standard_rate numeric;
alter table jobs  add column price numeric, add column special_request text,
                  add column created_by_account_id uuid references accounts(id),
                  add column idempotency_key text;
-- source value 'owner_manual' for owner-created jobs
create unique index jobs_owner_manual_dedupe on jobs (unit_id, checkout_date)
  where source = 'owner_manual' and cancelled_at is null;
create unique index jobs_idempotency on jobs (idempotency_key) where idempotency_key is not null;

create table job_price_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id),
  old_price numeric, new_price numeric not null,
  changed_by_account_id uuid not null references accounts(id),
  reason text, changed_at timestamptz not null default now()
);

create table notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,                      -- job_created, special_request, escalation, ...
  dedupe_key text not null unique,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(), sent_at timestamptz
);

-- manual job + outbox in ONE transaction (call via supabase.rpc)
create function create_owner_job(
  p_unit_id uuid, p_date date, p_time text, p_special_request text,
  p_account_id uuid, p_idempotency_key text
) returns uuid language plpgsql as $$ ... $$;       -- inserts job (source='owner_manual', job_key='owner_manual:'||id,
                                                    -- price=units.standard_rate, expected_hours=units.expected_hours)
                                                    -- + outbox rows (job_created; special_request if text present)
-- price change + history in ONE transaction
create function update_job_price(p_job_id uuid, p_new_price numeric, p_account_id uuid, p_reason text)
  returns void language plpgsql as $$ ... $$;
```
All new tables: `alter table … enable row level security;` with **no policies** (deny-all to anon). Only the service-role client touches them. (Fill in the two function bodies; keep them `security invoker`, set explicit `search_path`.)

### 3.2 Env vars (add to `.env.local.example`, remove all Airtable ones)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (existing), `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`), `AUTH_SECRET` (32+ random bytes, hex; HMAC key), `N8N_WEBHOOK_BASE_URL`, `N8N_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`, `PILOT_USE_FAKE_DATA`, `PILOT_FAKE_ROLE` (fake mode only: `cleaner|owner|manager|multi|admin`).

### 3.3 Module layout (new)

```
lib/auth/config.ts        constants: CODE_TTL=10min, MAX_ATTEMPTS=5, IDLE_DAYS=30, HARD_DAYS=90,
                          RATE limits (3 sends/15min/phone, 10/day/phone, 20/hour/ip), COOKIE name
lib/auth/crypto.ts        randomToken(), sha256(), hmac(), timingSafeEqual(), generateCode() (CSPRNG, 6 digits, zero-padded)
lib/auth/phone.ts         normalizePhone(input) -> E.164 | null  (default +1; reject non-NANP garbage)
lib/auth/return-to.ts     safeReturnTo(raw): only paths starting with '/pilot/' and not '//' or '\' or scheme; else '/pilot/today'
lib/auth/rate-limit.ts    count auth_events in window; throws RateLimited
lib/auth/codes.ts         requestLoginCode(phone, ctx) / verifyCode(...)  (identical response for unknown phone)
lib/auth/devices.ts       createDevice(accountId, ua) / resolveDevice(rawToken) / touch / revoke / revokeAll
lib/auth/session.ts       getSession(): reads cookie -> Session | null ; requireSession(returnTo)
lib/auth/permissions.ts   PURE: can(session, action, ctx) per the matrix; unit-tested
lib/auth/sender.ts        sendOtp(phone, code, idempotencyKey) -> POST N8N_WEBHOOK_BASE_URL/otp with X-Webhook-Secret
lib/auth/types.ts         Session, Grant types
lib/pilot/outbox.ts       enqueue helpers + best-effort immediate webhook kick (idempotent by dedupe_key)
```
`Session = { accountId, displayName, staffId|null, customerId|null, isAdmin, grants: Grant[] }`, `Grant = { role: 'owner'|'manager'|'cleaner'; buildingId: string; managementMode: 'lcp'|'self'; canEditPrice: boolean; isPrimary: boolean }`. `getSession()` builds grants from: `buildings.customer_id = account.customer_id` (owner), `building_cleaners` where `staff_id = account.staff_id and revoked_at is null` (cleaner), `role_assignments` (manager). It must be cheap (one round of 3 queries).

### 3.4 Auth flow details (security requirements)

- **Request code** (server action): normalize phone; check rate limits (phone + IP); look up active account; **always return the same message** ("If that number is registered, we sent a code") and same timing as best you can. If registered: create `verification_codes` row (code never stored raw), send via `sendOtp`. Record `auth_events`. Invalidate earlier unconsumed login codes for that phone.
- **Verify code**: find newest unconsumed unexpired code for phone; if `attempts >= 5` reject; increment attempts first; constant-time compare HMAC; on success mark consumed (single use, atomically: `update … where consumed_at is null returning`), create trusted device, set cookie, return `redirect(safeReturnTo)`.
- **Cookie**: random 32-byte token (base64url), DB stores SHA-256 only. Name `__Host-lcp_device` in production (requires `Secure`, `Path=/`, no `Domain`), `lcp_device` in dev. `HttpOnly; SameSite=Lax; Secure` in prod; `maxAge` = HARD_DAYS.
- **Device check** on every `getSession()`: row exists, not revoked, `now < idle_expires_at`, `now < hard_expires_at`, account active. Slide `idle_expires_at = min(now+IDLE, hard_expires_at)` and update `last_seen_at` at most once per hour. Hard cap is anchored at `verified_at`; only a new SMS verification resets it.
- **Revocation**: account page lists devices (label from user agent, last seen) with "Sign out this device" and "Sign out all other devices". Admin can revoke any account's devices.
- **Phone change (user)**: two codes (to current number, then to new number); on success update `accounts.phone_e164`, revoke all *other* devices.
- **Admin tools** (`staff.is_admin` only, audited in `auth_events`): create account (phone + link staff/customer + display name); **change an account's phone number** (revokes all its devices); **issue a one-time login code** (shown once on screen to the admin, purpose `admin_issued`, 10-min TTL, single use, then the user enters it on the normal sign-in screen); revoke devices.
- **Job links**: SMS contains `${NEXT_PUBLIC_SITE_URL}/pilot/j/<jobId>`. `/pilot/j/[jobId]` calls `getSession()`; no session → redirect to `/pilot/signin?returnTo=/pilot/j/<jobId>`; session → authorize `job.view` and redirect to the right view for the role (cleaner → `/pilot/today/<jobId>` or `/pilot/my-jobs/<jobId>`, owner/manager → `/pilot/jobs/<jobId>`); not authorized → generic not-found. The URL alone reveals nothing.
- **Fake mode**: `getSession()` returns a synthetic session from `PILOT_FAKE_ROLE`; the code `000000` always works on the sign-in screen; both paths hard-disabled when `PILOT_USE_FAKE_DATA=false`.
- Photos: bucket `report-photos` must be **private**; store the storage *path* (not a public URL) and serve via short-lived signed URLs minted after `photo.view` authorization. (Existing rows hold public URLs — migrate or handle both when reading.)

### 3.5 Routes (final)

| Route | Who | Replaces |
|---|---|---|
| `/` | everyone | new landing: redirect to `/pilot/today` if cleaner-only, `/pilot/properties` if owner/manager, `/pilot/signin` if no session |
| `/pilot/signin` | public | — |
| `/pilot/j/[jobId]` | link target | token job links |
| `/pilot/today`, `/pilot/today/[jobId]` | cleaner | `/pilot/job/[token]` (+view) |
| `/pilot/my-jobs`, `/pilot/my-jobs/[jobId]` | cleaner | `/pilot/history/[token]` (+view) |
| `/pilot/account` | all | `/pilot/account/[token]` (+ devices, change phone) |
| `/pilot/properties` | owner/manager | new |
| `/pilot/jobs`, `/pilot/jobs/[jobId]` | owner/manager | new |
| `/pilot/team` | owner/manager | new |
| `/pilot/admin` | admin | new |
| `/pilot/{job,history,account}/[token]` | legacy | become **redirect shims** to `/pilot/signin?returnTo=/pilot/today` (never log the token) |

Navigation (`PilotShell`, built from `session.grants`; union for multi-role): cleaner-only = `Today · My Jobs · Account`; owner/manager = `Properties · Jobs · Team · Account`; owner/manager who is also a cleaner = `Properties · Jobs · My Jobs · Team · Account` (Today lives inside My Jobs/Jobs for them); admin adds `Admin`. Components stop taking a `token` prop; build hrefs from the new routes.

## 4. Steps

### Pass 0 — Stabilize and clean up (no live changes without the human)

**S0.1 [DONE 2026-10-26 — see `docs/live-state-2026-10-26.md`] Verify live state.** Key results: every public table has a `public` ALL `using true` policy ("app access") and n8n sends the publishable key inline; the `report-photos` bucket is public; the dispatch workflow sends a twice-daily digest via OpenPhone to all alert-enabled staff and contains **no job links**; the orphan-cancel logic is still unpublished and must not touch `source='owner_manual'` rows; no job-created notification exists yet (new n8n work). Original instructions kept below for reference. Read-only. Use Supabase MCP (`list_tables`, `get_advisors`, `execute_sql` for `select * from pg_policies where schemaname='public'`) and n8n MCP (`get_workflow_details` for sync `vLqEncMURiYDUkhh`, dispatch `QAYKafRjWcZU6LMi`). Write findings to `docs/live-state-<date>.md`: (a) actual RLS policies per table; (b) which credential n8n uses; (c) how Quo SMS is sent and what link the dispatch SMS contains (does it embed `/pilot/job/<token>`?); (d) how dispatch picks up new jobs; (e) whether the cancellation-fix draft would cancel jobs lacking `airbnb_uid`; (f) `report-photos` bucket visibility; (g) whether `access_links` has rows.
*Done when:* the file exists and lists each answer. If an answer is unavailable, say so; do not guess.

**S0.2 Delete the dead Airtable portal.** Delete: `app/(app)/`, `app/login/`, `lib/airtable/`, `lib/mock-store.tsx`, `lib/session.ts`, `lib/types.ts`, `lib/bundle-suggestions.ts`, `lib/deadline-groups.ts`, `components/layout/`, `components/profile/`, `components/reports/`, `components/routes/`, `components/units/`, and everything in `components/jobs/` **except** `completion-checklist.tsx`, which the pilot uses — move it to `components/pilot/completion-checklist.tsx` and update the import in `components/pilot/completion-flow.tsx`. Remove Airtable/`SESSION_SECRET` entries from `.env.local.example`. Add a temporary `app/page.tsx` that redirects to `/pilot/signin` (replaced in S2.1). Update `app/layout.tsx` metadata description (it says "Employee operations app"). Run `grep -ri airtable . --exclude-dir=node_modules` → nothing left except historical docs. Remove unused deps if any (`pnpm exec tsc` + `pnpm build` tell you what's unused; `cn` and `shadcn` packages: leave unless clearly unused).
*Done when:* `pnpm lint`, `tsc`, `build` pass; `/pilot/job/fake-link-1` still renders in fake mode.

**S0.3 Snapshot + rollback point.** **[HUMAN]** push the branch and create a git tag `pre-owner-manager` on the commit before Pass 1; take a DB snapshot doc like `docs/db-snapshot-2026-10-08.md`.

### Pass 1 — Identity, sessions, scoped roles, secured actions

**S1.1 Test tooling.** Add `vitest` (dev dep), `"test": "vitest run"` script, `vitest.config.ts` with the `@/` alias. `server-only` must be mocked/aliased in tests. *Done when:* `pnpm test` runs one trivial test.

**S1.2 Migrations (write, don't apply).** Create `supabase/migrations/0001_auth.sql`, `0002_roles.sql`, `0003_jobs_pricing.sql` from §3.1, filling in both plpgsql function bodies. **[HUMAN]** applies them (dev branch first). Regenerate DB types is optional; keep manual types in `lib/auth/types.ts`.

**S1.3 Pure auth modules + tests.** Implement `config`, `crypto`, `phone`, `return-to`, `permissions`. Tests (must pass): 
- `phone`: `780-850-0235`, `(780) 850 0235`, `+17808500235`, `17808500235` → `+17808500235`; letters/short → null.
- `return-to`: accepts `/pilot/j/abc`; rejects `//evil.com`, `https://x`, `/\evil`, `/other`, empty.
- `generateCode`: always 6 digits incl. leading zeros.
- `permissions`: the full role × building × action matrix from §2 — include cross-building denials (cleaner on A vs job on B), owner of a `lcp` building cannot `team.edit`, owner-who-is-also-manager-without-`can_edit_price` cannot `price.edit`, admin allowed, assigned-vs-unassigned `job.complete`, `job.accept` on already-claimed job denied.

**S1.4 Codes, devices, rate limit, sender (server).** Implement `rate-limit`, `codes`, `devices`, `sender`, `session`. Use the service-role Supabase client (update `lib/pilot/supabase.ts`: use `SUPABASE_SERVICE_ROLE_KEY` when set; in real-data mode throw if missing; keep it `server-only`). Tests with a mocked DB layer (inject the Supabase client): single-use code; 6th attempt fails and code invalidated; expired code fails; new code invalidates older; unknown phone yields the same response shape; rate limits trigger; device idle/hard expiry; revoked device rejected; hard cap not extended by sliding. 

**S1.5 Sign-in UI + actions.** `app/pilot/signin/page.tsx` (two steps: phone → code; carries `returnTo`), server actions `requestCode`, `submitCode`, `signOut`. Reuse `ui/` components and the pilot look. Generic error copy only. *Done when* in fake mode `000000` signs in and returns to `returnTo`.

**S1.6 Refactor pilot to sessions.** Move/rename routes per §3.5; delete `token` props; add `/pilot/j/[jobId]`; add legacy shims. Refactor `lib/pilot/queries.ts` and `actions.ts`:
- Every query takes the `Session`, resolves allowed `building_id`s → unit ids via the grants (`building_cleaners.revoked_at is null`) and scopes **in the query** (`.in('unit_id', …)`). `getJobById(jobId, session)` returns null outside scope.
- Every action loads the session itself (`requireSession`), loads the job/report, and calls `can(...)`; reject with a generic message otherwise. Remove client-supplied `staffId`; `reportIssue` sets `staff_id` from the session. `requestNewCleanerLink` and `lib/pilot/links.ts` are deleted (links are non-secret now); `account-actions.tsx` is replaced by the devices/phone-change UI.
- `acceptJob`: single atomic `update … where id=$1 and assigned_staff_id is null and cancelled_at is null and status in (...) returning id`; zero rows → "no longer available".
- Photos: authorize `photo.upload`, store path, return signed URL on read.
- Keep cleaner opportunity listing unchanged in behavior (cleaner sees open jobs at their buildings). The manager "unaccepted" view is a **separate** function gated by `can(session,'job.view')` with a manager grant — a cleaner grant must never reach it (test this).
- Mirror everything in `fake-store.ts` (extend fakes with: two buildings, an owner, a manager, an admin, so cross-scope tests are possible in fake mode).

**S1.7 Account page.** Devices list + sign out (this/all others), change phone (two-code flow), per D4.

**S1.8 Admin page.** `/pilot/admin`: accounts list/create, change phone, issue one-time code, revoke devices; all audited to `auth_events`; every action re-checks `isAdmin`.

**S1.9 [HUMAN] n8n OTP + link changes.** Spec to give the human: create n8n webhook `POST /otp` (header `X-Webhook-Secret` must match; body `{ to, code, idempotencyKey }`; send "Your LCP code is {code}. It expires in 10 minutes." through Quo; ignore repeated `idempotencyKey`). Update dispatch SMS to use `/pilot/j/<jobId>` links. Do not change live workflows until verified on a copy.

*Pass 1 release gate (all must pass):* `pnpm test`, `lint`, `tsc`, `build`; the permission matrix and code/device tests green; manual checklist in fake mode for each `PILOT_FAKE_ROLE`; **human** confirms the real cleaner flow (sync → SMS → link → verify code → accept → complete → report) works on staging with a real phone; no token/code appears in server logs or URLs (grep logs); cookie flags verified in browser devtools; legacy token URLs redirect without logging the token.

### Pass 2 — Shared shell and owner unit board (first user-visible release)

**S2.1 Shell + landing.** `PilotShell` takes `session`; nav from grants per §3.5; replace the temporary `app/page.tsx` redirect with the role-aware one.
**S2.2 Properties** (`/pilot/properties`): query units for the session's owner/manager buildings. Unit status (single function `lib/pilot/unit-status.ts`, unit tested): *Flagged* = has a report with `status <> 'Resolved'` or latest job result in (`Needs attention`,`Not clean`); else *Needs clean* = a non-cancelled job in (Open, Upcoming, Ready, Claimed) exists; else *Ready*. Counts header + cards (follow the layout from the design: counts row, unit cards with "Last clean" / "Cleaning scheduled" / "Issue reported"). Unit click opens a `MasterDetail` panel (unit info read-only in this pass).
**S2.3 Jobs** (`/pilot/jobs`, `/pilot/jobs/[jobId]`): reuse `JobList`, `HistoryList`, `MasterDetail`, detail panels with an owner variant. One mapping function for owner-facing status copy (Open/Upcoming/Ready → "Scheduled"; Claimed → "Accepted"; Completed → "Clean"; Needs attention/Not clean → "Flagged"; cancelled → "Cancelled"). Owner query returns **no** `cleaner_pay`/cleaner identity beyond first name.
**S2.4 Team (read-only)** list of cleaners and managers for the session's buildings.
*Release gate:* two-owner fixture test — owner A can never see owner B's units/jobs/reports (query-level test); cleaner-only account sees exactly Today/My Jobs/Account; multi-role sees the union; unit-status function tests; mobile (bottom nav) and desktop (sidebar) both render.

### Pass 3 — Add Job, unit details, checklists, teams (second release)

**S3.1 Add Job** (`components/pilot/add-job-form.tsx`): `Sheet` on desktop, full-screen on mobile; fields: unit (preselected when opened from a unit card), date (default from current selection), start time, "Special request" checkbox + textarea. Price shown read-only from `units.standard_rate`. A client-generated idempotency key per form open prevents double submit.
**S3.2 `createManualJob` action:** `requireSession` → `can('job.create')` on the unit's building → validate (date not in the past, text length) → call `create_owner_job` RPC (job + outbox in one transaction). Duplicate (unit+date) → friendly "already scheduled" message. On success `revalidatePath` and best-effort kick the n8n webhook with the outbox id. The job appears immediately as "Scheduled".
**S3.3 [HUMAN] n8n job notifications:** workflow handling outbox events: `job_created` → SMS the building's cleaners (primary first, per current dispatch rules) with the `/pilot/j/<jobId>` link; `special_request` → SMS the primary manager (admin fallback); mark outbox `sent`/`failed`; scheduled retry for `pending` older than 2 minutes; dedupe by `dedupe_key`. **Also** confirm the sync workflow and its cancellation fix never touch `source='owner_manual'` rows.
**S3.4 Unit editing:** `updateUnit` action with an allow-list (`access_instructions`, `important_notes`, `special_requirements`, `checklist_items`), `can('unit.edit')`, and strict validation of `checklist_items` (array of `{id,title,description?}`, lengths capped, unique ids).
**S3.5 Team editing** (self-managed only, server-enforced): add/remove cleaner (soft remove via `building_cleaners.revoked_at`; adding a new person creates `staff` + `accounts` rows), assign manager (`role_assignments`, set `is_primary`, `can_edit_price`). LCP-managed owners see read-only team; the actions reject them even if called directly.
*Release gate:* tests — owner cannot create job on another owner's unit; double submit creates exactly one job; unique (unit,date) index rejects duplicates; LCP-managed owner `team.edit` rejected server-side; checklist validation rejects bad shapes; **human** verifies: manual job SMS reaches the right cleaner exactly once (also after a simulated n8n failure and retry), an iCal sync run leaves the manual job intact.

### Pass 4 — Manager exceptions and pricing

**S4.1 Manager flagged view** (`/pilot/jobs?filter=attention`): urgent/unresolved reports, jobs with `special_request`, unaccepted jobs near `latest_clean_date` (threshold constant). Reports gain `Resolved` handling (manager button).
**S4.2 Price editing:** `updateJobPrice` action → `can('price.edit')` → `update_job_price` RPC (writes `jobs.price` + `job_price_history`). UI shows history. Price absent from cleaner payloads.
**S4.3 Escalations [HUMAN n8n]:** scheduled workflow queries for risk conditions and enqueues outbox events (`escalation`), deduped per job+condition; sends to the building's primary manager; admin if none/unreachable.
*Release gate:* owner without `can_edit_price` cannot change price (direct call rejected); every change has a history row; two managers → only the primary is alerted; no primary → admin alerted; each exception produces exactly one alert; grep shows no `price` in cleaner serializers and no `cleaner_pay` in owner serializers.

### Final — Docs

Replace the boilerplate `README.md` with: setup, env vars, fake vs real mode, running tests, auth overview, how to onboard a person (admin creates account → sends them the app URL), and the runbook for lost phone (admin changes number or issues a code). Keep `docs/` plans.

## 5. Definition of done

- All four pass gates satisfied; `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build` clean.
- No Airtable code or env remains.
- Real-data mode uses the service-role key; no public RLS policies remain on the tables the app uses (**[HUMAN]**, after n8n is confirmed on a privileged credential).
- Existing cleaner flow verified on real data by the human.
- Branch pushed, PRs per pass into `main`, tag `pre-owner-manager` exists as rollback.

## 6. Still needs the human (summary)

S0.1 live inspection sign-off · S0.3 push + tag · applying the 3 migrations · S1.9 OTP workflow + SMS link change · S3.3 job-notification workflow · S4.3 escalation workflow · switching n8n to a privileged credential and removing public policies · production env vars (`AUTH_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, webhook secret) · Fly-Marketing GitHub login for pushing.
