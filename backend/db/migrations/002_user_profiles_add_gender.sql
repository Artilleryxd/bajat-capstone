-- Add gender to user_profiles for onboarding step 1 data capture.
alter table public.user_profiles
  add column if not exists gender text;
