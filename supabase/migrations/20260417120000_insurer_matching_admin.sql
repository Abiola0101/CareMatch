-- Insurer case extensions, match results, profile suspension, insurer renewal

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

ALTER TABLE public.insurer_profiles
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz;

ALTER TABLE public.insurer_cases
  ADD COLUMN IF NOT EXISTS treatments_tried text,
  ADD COLUMN IF NOT EXISTS share_token text DEFAULT gen_random_uuid()::text NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS insurer_cases_share_token_uidx
  ON public.insurer_cases (share_token);

ALTER TABLE public.insurer_cases
  DROP CONSTRAINT IF EXISTS insurer_cases_urgency_chk;

ALTER TABLE public.insurer_cases
  ADD CONSTRAINT insurer_cases_urgency_chk CHECK (
    urgency IS NULL
    OR urgency IN ('routine', 'within_4_weeks', 'within_1_week')
  );

-- Insurers may update their own cases (e.g. policyholder ref); matching uses service role
DROP POLICY IF EXISTS "insurer_cases_update_own" ON public.insurer_cases;

CREATE POLICY "insurer_cases_update_own"
  ON public.insurer_cases FOR UPDATE
  TO authenticated
  USING (insurer_id = auth.uid())
  WITH CHECK (insurer_id = auth.uid ());

CREATE TABLE public.insurer_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
  insurer_case_id uuid NOT NULL REFERENCES public.insurer_cases (id) ON DELETE CASCADE,
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  match_score numeric(5, 2),
  score_clinical numeric(5, 2),
  score_subspec numeric(5, 2),
  score_volume numeric(5, 2),
  score_outcomes numeric(5, 2),
  score_avail numeric(5, 2),
  rank_position integer,
  computed_at timestamptz NOT NULL DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS insurer_match_results_case_idx
  ON public.insurer_match_results (insurer_case_id, rank_position);

ALTER TABLE public.insurer_match_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurer_match_results_select_case_owner_or_admin"
  ON public.insurer_match_results FOR SELECT
  TO authenticated
  USING (
    public.is_admin ()
    OR EXISTS (
      SELECT 1
      FROM public.insurer_cases ic
      WHERE ic.id = insurer_match_results.insurer_case_id
        AND ic.insurer_id = auth.uid ()
    )
  );

CREATE POLICY "insurer_match_results_write_admin"
  ON public.insurer_match_results FOR ALL
  TO authenticated
  USING (public.is_admin ())
  WITH CHECK (public.is_admin ());
