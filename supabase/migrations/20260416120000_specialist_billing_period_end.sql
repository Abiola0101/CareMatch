-- Renewal date for specialist subscription (aligned with Stripe current period)
ALTER TABLE public.specialist_profiles
  ADD COLUMN IF NOT EXISTS billing_period_end timestamptz;
