-- Manager overrides on a job (mark done, assign a cleaner, archive), with the manager's comment.
create table public.job_overrides (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id),
  action text not null check (action in ('markDone', 'assign', 'archive')),
  comment text,
  account_id uuid not null references public.accounts(id),
  created_at timestamptz not null default now()
);
create index job_overrides_job_idx on public.job_overrides (job_id, created_at desc);
alter table public.job_overrides enable row level security;
