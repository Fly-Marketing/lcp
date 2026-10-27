-- Owner-created jobs, customer pricing (separate from cleaner_pay), notification outbox.

alter table public.units add column standard_rate numeric;

alter table public.jobs
  add column price numeric,
  add column special_request text,
  add column created_by_account_id uuid references public.accounts(id),
  add column idempotency_key text;

-- Owner-created jobs are source = 'owner_manual'. One live manual job per unit per day.
create unique index jobs_owner_manual_dedupe on public.jobs (unit_id, checkout_date)
  where source = 'owner_manual' and cancelled_at is null;
create unique index jobs_idempotency_key_idx on public.jobs (idempotency_key)
  where idempotency_key is not null;

alter table public.reports add column resolved_at timestamptz;

create table public.job_price_history (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  old_price numeric,
  new_price numeric not null,
  changed_by_account_id uuid not null references public.accounts(id),
  reason text,
  changed_at timestamptz not null default now()
);
create index job_price_history_job_idx on public.job_price_history (job_id, changed_at desc);
alter table public.job_price_history enable row level security;

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  dedupe_key text not null unique,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_outbox_status_idx on public.notification_outbox (status, created_at);
alter table public.notification_outbox enable row level security;

-- Atomically create an owner job + its notification events.
-- Returns {job_id, status}: status is 'created', 'duplicate' (same unit+day already scheduled)
-- or 'replayed' (same idempotency key seen before).
create or replace function public.create_owner_job(
  p_unit_id uuid,
  p_date date,
  p_time text,
  p_special_request text,
  p_account_id uuid,
  p_idempotency_key text
) returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_unit public.units%rowtype;
  v_building public.buildings%rowtype;
  v_existing uuid;
  v_job_id uuid := gen_random_uuid();
  v_today date := (now() at time zone 'America/Edmonton')::date;
  v_special text := nullif(btrim(coalesce(p_special_request, '')), '');
begin
  if p_idempotency_key is not null then
    select id into v_existing from public.jobs where idempotency_key = p_idempotency_key;
    if found then
      return jsonb_build_object('job_id', v_existing, 'status', 'replayed');
    end if;
  end if;

  select * into v_unit from public.units where id = p_unit_id and active;
  if not found then
    raise exception 'unit_not_found';
  end if;
  select * into v_building from public.buildings where id = v_unit.building_id;

  select id into v_existing from public.jobs
   where unit_id = p_unit_id and checkout_date = p_date
     and source = 'owner_manual' and cancelled_at is null;
  if found then
    return jsonb_build_object('job_id', v_existing, 'status', 'duplicate');
  end if;

  begin
    insert into public.jobs (
      id, job_key, unit_id, client, property_building, address, area,
      checkout_date, checkout_time, check_in_time, earliest_clean_date, latest_clean_date,
      expected_hours, cleaner_pay, turnover_type, priority, status, source,
      special_request, notes, price, created_by_account_id, idempotency_key
    ) values (
      v_job_id,
      coalesce(v_unit.unit_name, 'Unit') || '|owner_manual:' || v_job_id::text,
      p_unit_id, v_unit.client,
      coalesce(v_building.name, v_unit.property_building), coalesce(v_unit.address, v_building.address), v_unit.area,
      p_date, coalesce(nullif(btrim(p_time), ''), v_unit.checkout_time), v_unit.check_in_time, p_date, p_date,
      v_unit.expected_hours, v_unit.cleaner_pay, 'Flexible', 'Normal',
      case when p_date <= v_today then 'Ready' else 'Upcoming' end, 'owner_manual',
      v_special, v_special, v_unit.standard_rate, p_account_id, p_idempotency_key
    );
  exception when unique_violation then
    select id into v_existing from public.jobs
     where unit_id = p_unit_id and checkout_date = p_date
       and source = 'owner_manual' and cancelled_at is null;
    return jsonb_build_object('job_id', v_existing, 'status', 'duplicate');
  end;

  insert into public.notification_outbox (event_type, dedupe_key, payload)
  values ('job_created', 'job_created:' || v_job_id::text,
          jsonb_build_object('job_id', v_job_id, 'unit_id', p_unit_id, 'building_id', v_unit.building_id, 'date', p_date));
  if v_special is not null then
    insert into public.notification_outbox (event_type, dedupe_key, payload)
    values ('special_request', 'special_request:' || v_job_id::text,
            jsonb_build_object('job_id', v_job_id, 'building_id', v_unit.building_id, 'text', v_special));
  end if;

  return jsonb_build_object('job_id', v_job_id, 'status', 'created');
end;
$$;

-- Change a job's customer price and record history in one transaction.
create or replace function public.update_job_price(
  p_job_id uuid,
  p_new_price numeric,
  p_account_id uuid,
  p_reason text
) returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_old numeric;
begin
  if p_new_price is null or p_new_price < 0 then
    raise exception 'invalid_price';
  end if;
  select price into v_old from public.jobs where id = p_job_id for update;
  if not found then
    raise exception 'job_not_found';
  end if;
  insert into public.job_price_history (job_id, old_price, new_price, changed_by_account_id, reason)
  values (p_job_id, v_old, p_new_price, p_account_id, nullif(btrim(coalesce(p_reason, '')), ''));
  update public.jobs set price = p_new_price where id = p_job_id;
end;
$$;
