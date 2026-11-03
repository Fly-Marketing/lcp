-- Every manager override carries a short tag so the record reads without the comment.
alter table public.job_overrides add column tag text not null check (
  tag in (
    'cleaned_outside_app', 'cleaner_forgot_to_log', 'owner_confirmed',
    'guest_cancelled', 'duplicate', 'booking_moved', 'property_unavailable', 'other'
  )
);
