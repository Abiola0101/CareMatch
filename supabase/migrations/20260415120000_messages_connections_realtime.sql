-- Messages for accepted connections + optional Stripe PI id for overage

ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS overage_payment_intent_id text;

CREATE UNIQUE INDEX IF NOT EXISTS connections_overage_payment_intent_id_uidx
  ON public.connections (overage_payment_intent_id)
  WHERE overage_payment_intent_id IS NOT NULL;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.connections (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  content text NOT NULL CHECK (
    char_length(content) > 0 AND char_length(content) <= 5000
  ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_connection_id_created_at_idx
  ON public.messages (connection_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select_participants"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.id = messages.connection_id
        AND c.status = 'accepted'
        AND (c.patient_id = auth.uid() OR c.specialist_id = auth.uid())
    )
  );

CREATE POLICY "messages_insert_participants"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.connections c
      WHERE c.id = messages.connection_id
        AND c.status = 'accepted'
        AND (c.patient_id = auth.uid() OR c.specialist_id = auth.uid())
    )
  );

-- Realtime (re-run safe: skip if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- One active request per case + specialist (declined/expired can retry)
CREATE UNIQUE INDEX IF NOT EXISTS connections_case_specialist_active_uidx
  ON public.connections (case_id, specialist_id)
  WHERE status IN ('pending', 'accepted');
