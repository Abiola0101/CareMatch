-- Free-text hospital entries for specialists (no hospital_profiles row required)
ALTER TABLE public.specialist_hospital_privileges
  ALTER COLUMN hospital_id DROP NOT NULL;

ALTER TABLE public.specialist_hospital_privileges
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.specialist_hospital_privileges
  DROP CONSTRAINT IF EXISTS specialist_priv_hospital_or_text_chk;

ALTER TABLE public.specialist_hospital_privileges
  ADD CONSTRAINT specialist_priv_hospital_or_text_chk CHECK (
    hospital_id IS NOT NULL
    OR (
      institution_name IS NOT NULL
      AND trim(institution_name) <> ''
      AND city IS NOT NULL
      AND trim(city) <> ''
      AND country IS NOT NULL
      AND trim(country) <> ''
    )
  );

-- Verification uploads metadata (files live in Storage)
CREATE TABLE public.specialist_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialist_profiles (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  doc_type text NOT NULL CHECK (
    doc_type IN ('medical_license', 'credential_certificate', 'privilege_letter')
  ),
  original_filename text,
  file_size integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS specialist_verification_documents_spec_idx
  ON public.specialist_verification_documents (specialist_id, created_at DESC);

ALTER TABLE public.specialist_verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialist_verification_docs_select_own_or_admin"
  ON public.specialist_verification_documents FOR SELECT
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_verification_docs_insert_own_or_admin"
  ON public.specialist_verification_documents FOR INSERT
  TO authenticated
  WITH CHECK (specialist_id = auth.uid() OR public.is_admin ());

CREATE POLICY "specialist_verification_docs_delete_own_or_admin"
  ON public.specialist_verification_documents FOR DELETE
  TO authenticated
  USING (specialist_id = auth.uid() OR public.is_admin ());

-- Private bucket for specialist verification files (10MB enforced in app + bucket limit where supported)
INSERT INTO storage.buckets (id, name, public)
VALUES ('specialist-verification', 'specialist-verification', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: specialists manage objects under folder named with their user id
DROP POLICY IF EXISTS "specialist_verification_select_own" ON storage.objects;
DROP POLICY IF EXISTS "specialist_verification_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "specialist_verification_update_own" ON storage.objects;
DROP POLICY IF EXISTS "specialist_verification_delete_own" ON storage.objects;

CREATE POLICY "specialist_verification_select_own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'specialist-verification'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "specialist_verification_insert_own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'specialist-verification'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "specialist_verification_update_own"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'specialist-verification'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

CREATE POLICY "specialist_verification_delete_own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'specialist-verification'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
