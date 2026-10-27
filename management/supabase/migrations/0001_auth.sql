-- Phone-verified accounts, SMS codes and trusted devices (one auth system for all roles).
-- All tables: RLS enabled with NO policies => only the service-role key can touch them.

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null unique,
  display_name text,
  staff_id uuid references public.staff(id),
  customer_id uuid references public.customers(id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index accounts_staff_id_idx on public.accounts (staff_id);
create index accounts_customer_id_idx on public.accounts (customer_id);

create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  code_hash text not null,
  purpose text not null check (purpose in ('login','change_phone_current','change_phone_new','admin_issued')),
  account_id uuid references public.accounts(id),
  new_phone_e164 text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index verification_codes_phone_idx on public.verification_codes (phone_e164, created_at desc);

create table public.trusted_devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id),
  token_hash text not null unique,
  user_agent text,
  verified_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  hard_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index trusted_devices_account_idx on public.trusted_devices (account_id);

create table public.auth_events (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  account_id uuid references public.accounts(id),
  actor_account_id uuid references public.accounts(id),
  key text,
  created_at timestamptz not null default now()
);
create index auth_events_kind_key_idx on public.auth_events (kind, key, created_at desc);

alter table public.accounts enable row level security;
alter table public.verification_codes enable row level security;
alter table public.trusted_devices enable row level security;
alter table public.auth_events enable row level security;

-- Bootstrap: one account per existing staff member that has a usable mobile number.
insert into public.accounts (phone_e164, display_name, staff_id)
select '+1' || right(regexp_replace(s.mobile, '\D', '', 'g'), 10), s.name, s.id
from public.staff s
where s.mobile is not null
  and length(regexp_replace(s.mobile, '\D', '', 'g')) >= 10
on conflict (phone_e164) do nothing;
