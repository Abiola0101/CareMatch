import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: rows, error } = await admin
    .from("connections")
    .select(
      "id, case_id, status, preferred_mode, message, match_score, created_at",
    )
    .eq("specialist_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[specialist/connections GET]", error);
    return NextResponse.json({ error: "Could not load connections" }, { status: 500 });
  }

  const list = rows ?? [];
  if (list.length === 0) {
    return NextResponse.json({ connections: [] });
  }

  const caseIds = Array.from(new Set(list.map((c) => c.case_id)));
  const { data: cases } = await admin
    .from("patient_cases")
    .select("id, condition_summary, age_group, urgency, specialty")
    .in("id", caseIds);

  const caseBy = new Map((cases ?? []).map((c) => [c.id, c]));

  const items = list.map((r) => {
    const pc = caseBy.get(r.case_id);
    const accepted = r.status === "accepted";
    const summary = accepted ? (pc?.condition_summary ?? "") : "";
    const truncated =
      summary.length > 200 ? `${summary.slice(0, 200)}…` : summary;
    return {
      id: r.id,
      status: r.status,
      preferred_mode: r.preferred_mode,
      message: accepted ? r.message : null,
      match_score: r.match_score,
      created_at: r.created_at,
      condition_summary: accepted ? truncated : "",
      age_group: accepted ? (pc?.age_group ?? null) : null,
      urgency: accepted ? (pc?.urgency ?? null) : null,
      specialty: pc?.specialty ?? null,
    };
  });

  return NextResponse.json({ connections: items });
}
