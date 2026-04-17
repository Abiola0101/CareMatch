-- Child profile trigger: inserts must not be blocked by RLS (policies are TO authenticated only).
-- Also set specialist defaults explicitly on insert.

CREATE OR REPLACE FUNCTION public.ensure_child_profile_for_role ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    INSERT INTO public.patient_profiles (id, primary_country)
    VALUES (NEW.id, 'Pending')
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.role = 'specialist' THEN
    INSERT INTO public.specialist_profiles (id, verified, is_accepting)
    VALUES (NEW.id, false, true)
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.role = 'hospital' THEN
    INSERT INTO public.hospital_profiles (id, institution_name, city, country)
    VALUES (NEW.id, 'Pending', 'Pending', 'Pending')
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.role = 'insurer' THEN
    INSERT INTO public.insurer_profiles (id, company_name)
    VALUES (NEW.id, 'Pending')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
