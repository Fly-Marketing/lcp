# LCP management app

Cleaning operations for LCP cleaners, property owners and managers. One app, one sign-in, role-aware screens.

- **Cleaners**: Today (open work at their buildings) · My Jobs · Account
- **Owners / managers**: Properties board · Jobs · Team · Account (owners add cleaning jobs; managers see exceptions and edit prices)
- **LCP admins**: everything above for every building, plus an Admin console (people, phone numbers, building settings, standard rates)

## How sign-in works

Everyone signs in with their mobile number: a 6-digit SMS code on a new device, then a trusted-device cookie
(30-day sliding window, 90-day hard cap before a new code is required). Devices are stored server-side and can be
revoked from **Account**. SMS job links (`/pilot/j/<jobId>`) are not secret; they send you through sign-in and back to the job.

- Code rules: 10-minute expiry, single use, 5 attempts, rate limited per phone and per IP. Responses never reveal whether a number is registered.
- Changing your own number needs a code on the current **and** the new number.
- **Lost phone / new number**: an LCP admin opens **Admin**, then either *Change number* (signs the person out everywhere) or *Give login code* (a one-time code to read out; they enter it with their number on the sign-in screen).
- Onboarding someone: Admin → *Add a person* (name, mobile, link to a cleaner and/or owner record), then tell them to open the app and sign in.

## Roles and permissions

Roles are additive and scoped to buildings. Owner comes from `buildings.customer_id`, cleaner from `building_cleaners`,
manager from `role_assignments`, admin from `staff.is_admin`. Every server action and query goes through
`lib/pilot/service.ts`, which authorizes the specific building/job via `lib/auth/permissions.ts` (a pure, unit-tested matrix).

Self-managed buildings (`buildings.management_mode = 'self'`) let the owner manage their own cleaners and managers; LCP-managed buildings
are read-only for owners. Price editing needs a manager grant with `can_edit_price` (or admin); the customer price is separate from `cleaner_pay`.

## Development

```bash
pnpm install
cp .env.local.example .env.local   # fill in values
pnpm dev
pnpm test            # unit tests (permissions, validation, service layer against an in-memory repo)
pnpm lint && pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm build
```

`PILOT_USE_FAKE_DATA=true` (default) runs against an in-memory dataset and signs you in automatically as `PILOT_FAKE_ROLE`
(`cleaner | owner | manager | multi | admin`). Set it to `false` for the real database, which needs `SUPABASE_SERVICE_ROLE_KEY`,
`AUTH_SECRET`, and the n8n webhook settings.

Database changes live in `supabase/migrations/` (apply in order; `0004_lockdown.sql` is deliberately last, see below).
Real-database tests: `RUN_DB_TESTS=1 pnpm exec vitest run test/db.integration.test.ts` (needs a valid service role key; cleans up after itself).

## Notifications

The app never sends SMS itself. n8n does, via Quo:

- `LCP - Auth OTP SMS` (webhook `/webhook/lcp-otp`): sign-in codes. Authenticated with `X-Webhook-Secret`, idempotent, execution data not stored.
- `LCP - Notification Outbox Dispatcher`: sends rows from `notification_outbox` (job created → the building's cleaners; special request → the primary manager, else admins).
  Rows are written in the same transaction as the job and deduplicated, so a job is never texted twice.
- `LCP - Job Dispatch (Morning / Evening)` and `LCP - Nightly Airbnb Sync` are unchanged apart from a defensive filter that keeps the sync's orphan-cancel logic away from owner-created jobs.

## Security notes

- Server-only Supabase service role key; no secrets in `NEXT_PUBLIC_*`.
- `0004_lockdown.sql` removes the old public "app access" RLS policies and makes the `report-photos` bucket private. Apply it **only after** the app runs with the service role key and every n8n workflow that talks to Supabase uses it instead of the publishable key.
- Never log codes, device tokens, or access instructions.
