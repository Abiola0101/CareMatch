import { normalizeEnvSecret } from "@/lib/env/normalize-env-secret";

type MatchPayload = { case_id: string; user_id: string } | { insurer_case_id: string; user_id: string };

export async function invokeMatchSpecialistsEdge(payload: MatchPayload): Promise<{
  ok: boolean;
  status: number;
  count?: number;
  error?: string;
}> {
  const url = normalizeEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = normalizeEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const matchInternal = normalizeEnvSecret(process.env.MATCH_INTERNAL_SECRET);

  if (!url || !anonKey || !serviceRoleKey) {
    return { ok: false, status: 500, error: "Server misconfigured" };
  }

  const fnBase = url.replace(/\/$/, "");
  const fnUrl = `${fnBase}/functions/v1/match-specialists`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: anonKey,
  };
  if (matchInternal) {
    headers["x-match-internal"] = matchInternal;
  }

  const res = await fetch(fnUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  let body: { success?: boolean; count?: number; error?: string } = {};
  if (rawText.trim()) {
    try {
      body = JSON.parse(rawText) as typeof body;
    } catch {
      return { ok: false, status: 502, error: "Invalid match response" };
    }
  }

  if (!res.ok) {
    return { ok: false, status: res.status, error: body.error ?? "Matching failed" };
  }

  return { ok: true, status: res.status, count: body.count ?? 0 };
}
