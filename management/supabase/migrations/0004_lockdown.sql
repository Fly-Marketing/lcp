-- LOCKDOWN — apply LAST, only after:
--   1. the app runs with SUPABASE_SERVICE_ROLE_KEY (Vercel + .env),
--   2. every n8n workflow that talks to Supabase uses the service-role key instead of the publishable key,
--   3. the report-photos bucket is private and the app serves signed URLs.
-- Removes the public "app access" policies; RLS stays enabled so anon/authenticated are denied.

drop policy if exists "app access" on public.access_links;
drop policy if exists "app access" on public.building_cleaners;
drop policy if exists "app access" on public.buildings;
drop policy if exists "app access" on public.bundles;
drop policy if exists "app access" on public.customers;
drop policy if exists "app access" on public.jobs;
drop policy if exists "app access" on public.reports;
drop policy if exists "app access" on public.staff;
drop policy if exists "app access" on public.units;
drop policy if exists "app access" on storage.objects;

update storage.buckets set public = false where id = 'report-photos';

revoke execute on function public.create_owner_job(uuid, date, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.update_job_price(uuid, numeric, uuid, text) from public, anon, authenticated;
grant  execute on function public.create_owner_job(uuid, date, text, text, uuid, text) to service_role;
grant  execute on function public.update_job_price(uuid, numeric, uuid, text) to service_role;
