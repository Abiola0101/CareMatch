-- After a row is inserted into profiles, ensure the matching role-specific table has a row.
-- Runs as SECURITY DEFINER so it is not blocked by RLS on patient_profiles / etc.

CREATE OR REPLACE FUNCTION public.ensure_child_profile_for_role ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'patient' THEN
    INSERT INTO public.patient_profiles (id, primary_country)
    VALUES (NEW.id, 'Pending')
    ON CONFLICT (id) DO NOTHING;
  ELSIF NEW.role = 'specialist' THEN
    INSERT INTO public.specialist_profiles (id)
    VALUES (NEW.id)
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

DROP TRIGGER IF EXISTS trg_profiles_ensure_child ON public.profiles;

CREATE TRIGGER trg_profiles_ensure_child
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE PROCEDURE public.ensure_child_profile_for_role ();
