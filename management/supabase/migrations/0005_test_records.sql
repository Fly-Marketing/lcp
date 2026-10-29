-- Test records are marked explicitly. A test account may sign in on the preview without a text
-- message (lib/auth/test-signin.ts). Nothing here changes how real people sign in.
alter table public.accounts add column if not exists is_test boolean not null default false;
alter table public.buildings add column if not exists is_test boolean not null default false;
