-- Performance indexes for the most common CareMatch Global queries
-- Run: supabase db push  (or apply via Supabase Dashboard → SQL Editor)

-- Connections: patient lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_connections_patient_id ON public.connections(patient_id);
CREATE INDEX IF NOT EXISTS idx_connections_specialist_id ON public.connections(specialist_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections(status);

-- Patient cases: patient lookups
CREATE INDEX IF NOT EXISTS idx_patient_cases_patient_id ON public.patient_cases(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_cases_status ON public.patient_cases(status);

-- Match results: case lookups
CREATE INDEX IF NOT EXISTS idx_match_results_case_id ON public.match_results(case_id);
CREATE INDEX IF NOT EXISTS idx_match_results_score ON public.match_results(match_score DESC);

-- Messages: connection thread lookups
CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON public.messages(connection_id, created_at DESC);

-- Specialist profiles: accepting + specialty (used by matching engine)
CREATE INDEX IF NOT EXISTS idx_specialist_profiles_specialty_accepting ON public.specialist_profiles(specialty, is_accepting);
