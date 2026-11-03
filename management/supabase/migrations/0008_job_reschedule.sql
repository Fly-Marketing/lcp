-- Manager reschedule: the override log records the new date, and reschedule reason tags.
alter table public.job_overrides drop constraint if exists job_overrides_action_check;
alter table public.job_overrides add constraint job_overrides_action_check
  check (action in ('markDone', 'assign', 'archive', 'reschedule'));

alter table public.job_overrides add column new_date date;

alter table public.job_overrides drop constraint if exists job_overrides_tag_check;
alter table public.job_overrides add constraint job_overrides_tag_check check (
  tag in (
    'cleaned_outside_app', 'cleaner_forgot_to_log', 'owner_confirmed',
    'guest_cancelled', 'duplicate', 'booking_moved', 'property_unavailable',
    'guest_changed_dates', 'cleaner_unavailable', 'owner_requested', 'other'
  )
);
