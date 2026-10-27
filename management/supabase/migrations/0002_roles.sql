-- Building-scoped manager role, management mode, soft-removal of cleaner assignments.

create table public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  role text not null check (role in ('manager')),
  building_id uuid not null references public.buildings(id),
  can_edit_price boolean not null default false,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (account_id, role, building_id)
);
create unique index one_primary_manager_per_building
  on public.role_assignments (building_id) where is_primary and revoked_at is null;
alter table public.role_assignments enable row level security;

alter table public.buildings
  add column management_mode text not null default 'lcp' check (management_mode in ('lcp','self'));

alter table public.building_cleaners add column revoked_at timestamptz;
