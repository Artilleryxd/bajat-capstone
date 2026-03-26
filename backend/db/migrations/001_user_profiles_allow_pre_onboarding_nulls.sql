-- Allow profile row creation at signup with only id + onboarding_complete.
-- Onboarding endpoint will populate the remaining fields later.

alter table public.user_profiles
  alter column full_name drop not null,
  alter column date_of_birth drop not null,
  alter column country drop not null,
  alter column city drop not null,
  alter column monthly_income drop not null,
  alter column income_type drop not null,
  alter column currency drop not null,
  alter column marital_status drop not null,
  alter column num_dependents drop not null,
  alter column housing_status drop not null,
  alter column has_existing_loans drop not null;

-- Keep strictness for identity and flow state.
alter table public.user_profiles
  alter column id set not null,
  alter column onboarding_complete set not null;
