import { createClient } from "@supabase/supabase-js";
import { normalizeEnvSecret } from "@/lib/env/normalize-env-secret";

/**
 * Server-only client with service role. Bypasses RLS — use for webhooks and admin tasks.
 */
export function createServiceRoleClient() {
  const url = normalizeEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = normalizeEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
