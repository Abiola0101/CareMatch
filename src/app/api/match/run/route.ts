import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { normalizeEnvSecret } from "@/lib/env/normalize-env-secret";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  case_id: z.string().uuid(),
});

function bearerToken(request: NextRequest): string | null {
  const authHeader =
    request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 ? token : null;
}

export async function POST(request: NextRequest) {
  const token = bearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = normalizeEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = normalizeEnvSecret(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const serviceRoleKey = normalizeEnvSecret(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const matchInternal = normalizeEnvSecret(process.env.MATCH_INTERNAL_SECRET);

  if (!url || !anonKey) {
    console.error("[match/run] missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (!serviceRoleKey) {
    console.error("[match/run] missing SUPABASE_SERVICE_ROLE_KEY");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabaseAuth = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: authUser },
    error: authErr,
  } = await supabaseAuth.auth.getUser(token);

  if (authErr || !authUser) {
    console.warn("[match/run] getUser(jwt) failed", authErr?.message ?? "no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const { case_id } = parsed.data;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    console.error("[match/run] service role client", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: owned, error: oe } = await admin
    .from("patient_cases")
    .select("id")
    .eq("patient_id", authUser.id)
    .eq("id", case_id)
    .maybeSingle();

  if (oe) {
    console.error("[match/run] ownership check", oe);
    return NextResponse.json({ error: "Could not verify case" }, { status: 500 });
  }

  if (!owned) {
    console.warn("[match/run] case not owned", case_id, "user", authUser.id);
    return NextResponse.json(
      { error: "You do not have access to this case." },
      { status: 403 },
    );
  }

  const fnBase = url.replace(/\/$/, "");
  const fnUrl = `${fnBase}/functions/v1/match-specialists`;

  console.log("[match/run] invoking Edge Function (fetch)", {
    host: fnBase,
    case_id,
    user_id: authUser.id,
  });

  try {
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
      body: JSON.stringify({
        case_id,
        user_id: authUser.id,
      }),
    });

    const rawText = await res.text();
    let payload: { success?: boolean; count?: number; error?: string } = {};
    if (rawText.trim()) {
      try {
        payload = JSON.parse(rawText) as {
          success?: boolean;
          count?: number;
          error?: string;
        };
      } catch {
        console.error("[match/run] Edge Function returned non-JSON body");
        return NextResponse.json(
          { error: "Invalid response from matching service." },
          { status: 502 },
        );
      }
    }

    if (!res.ok) {
      console.warn("[match/run] Edge Function HTTP error", {
        status: res.status,
        payload,
      });
      return NextResponse.json(
        { error: payload.error ?? "Matching failed" },
        {
          status:
            res.status >= 400 && res.status < 600 ? res.status : 502,
        },
      );
    }

    return NextResponse.json({
      success: payload.success ?? true,
      count: payload.count ?? 0,
    });
  } catch (e) {
    console.error("[match/run] fetch to Edge Function threw", e);
    return NextResponse.json(
      { error: "Matching failed. Try again shortly." },
      { status: 502 },
    );
  }
}
