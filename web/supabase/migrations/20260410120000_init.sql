-- Kadrlar app schema. public.users.id references auth.users(id) — register after Supabase Auth signUp.
-- Apply in Supabase Dashboard → SQL, or via supabase db push.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'moderator',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);

CREATE TABLE public.admin_actions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.admin_users (id) ON DELETE CASCADE,
  action_type text NOT NULL,
  target_id text,
  notes text,
  performed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_actions_log_admin_id_performed_at_idx ON public.admin_actions_log (admin_id, performed_at);

CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  user_type text NOT NULL,
  full_name text NOT NULL,
  phone text,
  city text,
  country text NOT NULL DEFAULT 'Uzbekistan',
  profile_photo_url text,
  preferred_language text NOT NULL DEFAULT 'en',
  theme text NOT NULL DEFAULT 'light',
  is_verified boolean NOT NULL DEFAULT false,
  is_suspended boolean NOT NULL DEFAULT false,
  suspended_at timestamptz,
  suspended_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active timestamptz,
  onboarding_employee_completed boolean NOT NULL DEFAULT false,
  onboarding_employer_completed boolean NOT NULL DEFAULT false,
  notification_settings text
);

CREATE TABLE public.employee_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  job_title text,
  job_category text,
  job_subcategory text,
  bio text,
  skills text NOT NULL DEFAULT '[]',
  years_of_experience integer NOT NULL DEFAULT 0,
  education_level text,
  university text,
  field_of_study text,
  graduation_year integer,
  salary_min integer,
  salary_max integer,
  salary_negotiable boolean NOT NULL DEFAULT false,
  price_type text NOT NULL DEFAULT 'monthly',
  work_types text NOT NULL DEFAULT '[]',
  availability text,
  languages text NOT NULL DEFAULT '[]',
  portfolio_url text,
  cv_url text,
  contact_visible boolean NOT NULL DEFAULT true,
  is_profile_public boolean NOT NULL DEFAULT true,
  show_profile_views boolean NOT NULL DEFAULT true,
  profile_views integer NOT NULL DEFAULT 0,
  profile_strength integer NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  date_of_birth timestamptz,
  gender text
);
CREATE INDEX employee_profiles_job_category_idx ON public.employee_profiles (job_category);
CREATE INDEX employee_profiles_published_public_idx ON public.employee_profiles (published, is_profile_public);

CREATE TABLE public.work_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles (id) ON DELETE CASCADE,
  company_name text NOT NULL,
  job_title text NOT NULL,
  start_date timestamptz,
  end_date timestamptz,
  is_current boolean NOT NULL DEFAULT false,
  description text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.employee_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles (id) ON DELETE CASCADE,
  project_name text NOT NULL,
  description text,
  url text,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employee_profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  organization text NOT NULL,
  year integer
);

CREATE TABLE public.employer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_description text,
  industry text,
  company_size text,
  website text,
  company_logo_url text,
  is_verified boolean NOT NULL DEFAULT false
);

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name text NOT NULL,
  team_logo_url text,
  tagline text,
  description text,
  category text,
  skills text NOT NULL DEFAULT '[]',
  price_min integer,
  price_max integer,
  price_negotiable boolean NOT NULL DEFAULT false,
  price_type text NOT NULL DEFAULT 'monthly',
  work_types text NOT NULL DEFAULT '[]',
  availability text,
  city text,
  leader_id uuid NOT NULL REFERENCES public.users (id) ON DELETE RESTRICT,
  is_public boolean NOT NULL DEFAULT false,
  team_views integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  user_id uuid NOT NULL UNIQUE REFERENCES public.users (id) ON DELETE CASCADE,
  role_in_team text,
  is_leader boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX team_members_user_id_idx ON public.team_members (user_id);

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  invitee_user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, invitee_user_id)
);

CREATE TABLE public.team_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  url text,
  image_url text,
  completed_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE public.saved_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, team_id)
);

CREATE TABLE public.team_employer_views (
  team_id uuid NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, employer_id)
);

CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  employer_last_read timestamptz,
  employee_last_read timestamptz,
  status text NOT NULL DEFAULT 'active',
  UNIQUE (employer_id, employee_id)
);
CREATE INDEX conversations_employee_id_idx ON public.conversations (employee_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text',
  is_read boolean NOT NULL DEFAULT false,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_id_idx ON public.messages (conversation_id);
CREATE INDEX messages_sender_id_idx ON public.messages (sender_id);

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations (id) ON DELETE CASCADE,
  reviewer_type text NOT NULL,
  overall_rating integer NOT NULL,
  dimension_1_rating integer NOT NULL,
  dimension_2_rating integer NOT NULL,
  dimension_3_rating integer NOT NULL,
  written_review text,
  would_again boolean NOT NULL,
  is_published boolean NOT NULL DEFAULT false,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  response_text text,
  response_at timestamptz,
  published_at timestamptz,
  UNIQUE (reviewer_id, conversation_id)
);
CREATE INDEX reviews_reviewee_published_idx ON public.reviews (reviewee_id, is_published);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  related_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_id_is_read_idx ON public.notifications (user_id, is_read);

CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

CREATE TABLE public.saved_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  notes text,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, employee_id)
);

CREATE TABLE public.profile_view_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_view_logs_employer_viewed_idx ON public.profile_view_logs (employer_id, viewed_at);
CREATE INDEX profile_view_logs_employee_viewed_idx ON public.profile_view_logs (employee_id, viewed_at);

CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  search_keyword text,
  filters text NOT NULL DEFAULT '{}',
  alert_enabled boolean NOT NULL DEFAULT true,
  alert_frequency text NOT NULL DEFAULT 'instant',
  last_alerted_at timestamptz,
  match_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_searches_employer_id_idx ON public.saved_searches (employer_id);

CREATE TABLE public.saved_search_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saved_search_id uuid NOT NULL REFERENCES public.saved_searches (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  matched_at timestamptz NOT NULL DEFAULT now(),
  notified boolean NOT NULL DEFAULT false,
  UNIQUE (saved_search_id, employee_id)
);
CREATE INDEX saved_search_matches_saved_search_id_idx ON public.saved_search_matches (saved_search_id);

CREATE TABLE public.saved_candidate_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'interested',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employer_id, employee_id)
);
CREATE INDEX saved_candidate_statuses_employer_status_idx ON public.saved_candidate_statuses (employer_id, status);

CREATE TABLE public.profile_search_appearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  search_query text,
  appeared_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profile_search_appearances_employee_appeared_idx ON public.profile_search_appearances (employee_id, appeared_at);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_actions_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_employer_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_view_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_search_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_candidate_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_search_appearances ENABLE ROW LEVEL SECURITY;
