-- CareMatch Global — schema, RLS, auth profile trigger
-- Run in Supabase SQL Editor or: supabase db push

-- ---------------------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('patient', 'specialist', 'hospital', 'insurer', 'admin')),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  country text,
  timezone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. patient_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.patient_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  date_of_birth date,
  age_group text CHECK (age_group IN ('infant', 'child', 'teen', 'adult', 'senior', 'elder')),
  biological_sex text,
  primary_country text NOT NULL,
  health_card_number text,
  emergency_contact jsonb,
  subscription_tier text CHECK (subscription_tier IN ('essential', 'standard', 'premium')),
  connections_used integer NOT NULL DEFAULT 0,
  connections_limit integer NOT NULL DEFAULT 3,
  billing_period_end timestamptz,
  stripe_customer_id text UNIQUE,
  stripe_sub_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 3. specialist_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.specialist_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text,
  specialty text CHECK (specialty IN ('cardiology', 'oncology', 'orthopaedics')),
  sub_specialties text[],
  institution text,
  city text,
  country text,
  verified boolean NOT NULL DEFAULT false,
  verification_date timestamptz,
  case_volume_annual integer,
  years_experience integer,
  languages text[],
  bio text,
  profile_video_url text,
  willing_to_travel boolean NOT NULL DEFAULT false,
  travel_note text,
  subscription_tier text CHECK (subscription_tier IN ('listed', 'featured', 'network')),
  stripe_customer_id text UNIQUE,
  stripe_sub_id text UNIQUE,
  is_accepting boolean NOT NULL DEFAULT true,
  avg_clinic_wait_days integer,
  avg_proc_wait_days integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 4. specialist_licenses
-- ---------------------------------------------------------------------------
CREATE TABLE public.specialist_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  country text NOT NULL,
  jurisdiction text,
  license_number text,
  license_body text,
  valid_from date,
  valid_until date,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 5. hospital_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.hospital_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  institution_name text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  address text,
  accreditation text[],
  international_unit boolean NOT NULL DEFAULT false,
  website text,
  subscription_tier text CHECK (subscription_tier IN ('listed', 'partner', 'enterprise')),
  stripe_customer_id text UNIQUE,
  stripe_sub_id text UNIQUE,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 6. specialist_hospital_privileges
-- ---------------------------------------------------------------------------
CREATE TABLE public.specialist_hospital_privileges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospital_profiles (id) ON DELETE CASCADE,
  privilege_type text CHECK (
    privilege_type IN ('full_surgical', 'active_surgical', 'consulting', 'visiting_surgical')
  ),
  procedures text[],
  capacity_pct integer,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (specialist_id, hospital_id)
);

-- ---------------------------------------------------------------------------
-- 7. specialist_care_modes
-- ---------------------------------------------------------------------------
CREATE TABLE public.specialist_care_modes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  mode text CHECK (mode IN ('remote', 'telemedicine', 'medical_travel', 'fly_doctor')),
  available text CHECK (available IN ('yes', 'no', 'conditional')),
  detail text,
  fee_range text,
  wait_days integer,
  UNIQUE (specialist_id, mode)
);

-- ---------------------------------------------------------------------------
-- 8. patient_cases
-- ---------------------------------------------------------------------------
CREATE TABLE public.patient_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  specialty text CHECK (specialty IN ('cardiology', 'oncology', 'orthopaedics')),
  title text,
  condition_summary text,
  duration_months integer,
  urgency text CHECK (urgency IN ('routine', 'within_4_weeks', 'within_1_week')),
  age_group text,
  investigations_done text[],
  treatments_tried text,
  diagnosis_status text CHECK (diagnosis_status IN ('confirmed', 'suspected', 'unknown')),
  additional_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'matched')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 9. match_results
-- ---------------------------------------------------------------------------
CREATE TABLE public.match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.patient_cases (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  match_score numeric(5, 2),
  score_clinical numeric(5, 2),
  score_subspec numeric(5, 2),
  score_volume numeric(5, 2),
  score_outcomes numeric(5, 2),
  score_avail numeric(5, 2),
  rank_position integer,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 10. connections
-- ---------------------------------------------------------------------------
CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.patient_cases (id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patient_profiles (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  match_score numeric(5, 2),
  preferred_mode text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  is_overage boolean NOT NULL DEFAULT false,
  overage_charge numeric(8, 2),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 11. insurer_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.insurer_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  company_name text NOT NULL,
  country text,
  cases_used_month integer NOT NULL DEFAULT 0,
  cases_limit_month integer NOT NULL DEFAULT 20,
  subscription_tier text CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
  stripe_customer_id text UNIQUE,
  stripe_sub_id text UNIQUE,
  api_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 12. insurer_cases
-- ---------------------------------------------------------------------------
CREATE TABLE public.insurer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id uuid NOT NULL REFERENCES public.insurer_profiles (id) ON DELETE CASCADE,
  case_manager_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  specialty text CHECK (specialty IN ('cardiology', 'oncology', 'orthopaedics')),
  condition_summary text,
  age_group text,
  urgency text,
  investigations_done text[],
  policyholder_ref text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'matched', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Admin helper (SECURITY DEFINER avoids RLS recursion on profiles)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin ()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospital_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_hospital_privileges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_care_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurer_cases ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ());

CREATE POLICY "profiles_update_own_or_admin"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ())
  WITH CHECK (id = auth.uid() OR public.is_admin ());

-- patient_profiles
CREATE POLICY "patient_profiles_select_own_or_admin"
  ON public.patient_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ());

CREATE POLICY "patient_profiles_update_own_or_admin"
  ON public.patient_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ())
  WITH CHECK (id = auth.uid() OR public.is_admin ());

CREATE POLICY "patient_profiles_insert_own_or_admin"
  ON public.patient_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin ());

-- specialist_profiles (public read verified specialists)
CREATE POLICY "specialist_profiles_select_public_verified_or_own_or_admin"
  ON public.specialist_profiles FOR SELECT
  TO anon, authenticated
  USING (
    verified = true
    OR id = auth.uid()
    OR public.is_admin ()
  );

CREATE POLICY "specialist_profiles_update_own_or_admin"
  ON public.specialist_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ())
  WITH CHECK (id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_profiles_insert_own_or_admin"
  ON public.specialist_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin ());

-- specialist_licenses
CREATE POLICY "specialist_licenses_select_own_or_admin"
  ON public.specialist_licenses FOR SELECT
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_licenses_insert_own_or_admin"
  ON public.specialist_licenses FOR INSERT
  TO authenticated
  WITH CHECK (specialist_id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_licenses_update_own_or_admin"
  ON public.specialist_licenses FOR UPDATE
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ())
  WITH CHECK (specialist_id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_licenses_delete_own_or_admin"
  ON public.specialist_licenses FOR DELETE
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ());

-- hospital_profiles
CREATE POLICY "hospital_profiles_select_own_or_admin"
  ON public.hospital_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ());

CREATE POLICY "hospital_profiles_update_own_or_admin"
  ON public.hospital_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ())
  WITH CHECK (id = auth.uid() OR public.is_admin ());

CREATE POLICY "hospital_profiles_insert_own_or_admin"
  ON public.hospital_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin ());

-- specialist_hospital_privileges (public read)
CREATE POLICY "specialist_hospital_privileges_select_public"
  ON public.specialist_hospital_privileges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "specialist_hospital_privileges_write_own_or_admin"
  ON public.specialist_hospital_privileges FOR ALL
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ())
  WITH CHECK (specialist_id = auth.uid() OR public.is_admin ());

-- specialist_care_modes (public read)
CREATE POLICY "specialist_care_modes_select_public"
  ON public.specialist_care_modes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "specialist_care_modes_write_own_or_admin"
  ON public.specialist_care_modes FOR ALL
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ())
  WITH CHECK (specialist_id = auth.uid() OR public.is_admin ());

-- patient_cases
CREATE POLICY "patient_cases_select_own_or_admin"
  ON public.patient_cases FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin ());

CREATE POLICY "patient_cases_insert_own_or_admin"
  ON public.patient_cases FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid() OR public.is_admin ());

CREATE POLICY "patient_cases_update_own_or_admin"
  ON public.patient_cases FOR UPDATE
  TO authenticated
  USING (patient_id = auth.uid() OR public.is_admin ())
  WITH CHECK (patient_id = auth.uid() OR public.is_admin ());

-- match_results (read for case owner / specialist; writes for admin)
CREATE POLICY "match_results_select_case_patient_or_specialist_or_admin"
  ON public.match_results FOR SELECT
  TO authenticated
  USING (
    public.is_admin ()
    OR specialist_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.patient_cases pc
      WHERE pc.id = match_results.case_id
        AND pc.patient_id = auth.uid()
    )
  );

CREATE POLICY "match_results_write_admin"
  ON public.match_results FOR ALL
  TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());

-- connections
CREATE POLICY "connections_select_patient_or_specialist_or_admin"
  ON public.connections FOR SELECT
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR specialist_id = auth.uid()
    OR public.is_admin ()
  );

CREATE POLICY "connections_insert_patient_or_admin"
  ON public.connections FOR INSERT
  TO authenticated
  WITH CHECK (patient_id = auth.uid() OR public.is_admin ());

CREATE POLICY "connections_update_patient_or_specialist_or_admin"
  ON public.connections FOR UPDATE
  TO authenticated
  USING (
    patient_id = auth.uid()
    OR specialist_id = auth.uid()
    OR public.is_admin ()
  )
  WITH CHECK (
    patient_id = auth.uid()
    OR specialist_id = auth.uid()
    OR public.is_admin ()
  );

-- insurer_profiles
CREATE POLICY "insurer_profiles_select_own_or_admin"
  ON public.insurer_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ());

CREATE POLICY "insurer_profiles_update_own_or_admin"
  ON public.insurer_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin ())
  WITH CHECK (id = auth.uid() OR public.is_admin ());

CREATE POLICY "insurer_profiles_insert_own_or_admin"
  ON public.insurer_profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_admin ());

-- insurer_cases (per spec: SELECT/INSERT for own insurer)
CREATE POLICY "insurer_cases_select_own_or_admin"
  ON public.insurer_cases FOR SELECT
  TO authenticated
  USING (insurer_id = auth.uid() OR public.is_admin ());

CREATE POLICY "insurer_cases_insert_own_or_admin"
  ON public.insurer_cases FOR INSERT
  TO authenticated
  WITH CHECK (insurer_id = auth.uid() OR public.is_admin ());

CREATE POLICY "insurer_cases_update_admin"
  ON public.insurer_cases FOR UPDATE
  TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());

-- ---------------------------------------------------------------------------
-- Auth: new user → profiles row
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  fn text;
BEGIN
  r := COALESCE(new.raw_user_meta_data ->> 'role', 'patient');
  IF r NOT IN ('patient', 'specialist', 'hospital', 'insurer', 'admin') THEN
    r := 'patient';
  END IF;

  fn := COALESCE(
    NULLIF(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(COALESCE(new.email, 'user@local'), '@', 1),
    'User'
  );

  INSERT INTO public.profiles (id, role, full_name, email)
  VALUES (new.id, r, fn, COALESCE(new.email, ''));

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user ();
