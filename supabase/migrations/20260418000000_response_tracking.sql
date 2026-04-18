-- Response tracking columns for 48-hour specialist enforcement system

-- ---------------------------------------------------------------------------
-- connections: response timing columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS enquired_at timestamptz,
  ADD COLUMN IF NOT EXISTS specialist_first_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalation_48h_sent_at timestamptz;

-- Backfill enquired_at from created_at for existing rows
UPDATE public.connections
SET enquired_at = created_at
WHERE enquired_at IS NULL;

-- Make enquired_at default to now() for new rows
ALTER TABLE public.connections
  ALTER COLUMN enquired_at SET DEFAULT now();

-- ---------------------------------------------------------------------------
-- specialist_profiles: response rate
-- ---------------------------------------------------------------------------
ALTER TABLE public.specialist_profiles
  ADD COLUMN IF NOT EXISTS response_rate_pct integer
    CHECK (response_rate_pct IS NULL OR (response_rate_pct >= 0 AND response_rate_pct <= 100));
