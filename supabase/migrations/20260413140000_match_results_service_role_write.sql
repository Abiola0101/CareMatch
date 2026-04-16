-- Edge Functions and server-side jobs use the service_role JWT.
-- Ensure match_results can be written when RLS is evaluated for that role.
-- (service_role often bypasses RLS; this policy covers environments where it does not.)

DROP POLICY IF EXISTS "match_results_write_service_role" ON public.match_results;

CREATE POLICY "match_results_write_service_role"
  ON public.match_results
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
