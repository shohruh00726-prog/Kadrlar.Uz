-- Ensure employer_profiles.id / employee_profiles.id always get a value when omitted.
-- Fixes NOT NULL id violations if defaults were missing after a partial or manual schema setup.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.employer_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.employee_profiles
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
