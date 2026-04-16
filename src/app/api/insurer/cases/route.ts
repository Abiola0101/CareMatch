import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { invokeMatchSpecialistsEdge } from "@/lib/match/invoke-edge";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  specialty: z.enum(["cardiology", "oncology", "orthopaedics"]),
  condition_summary: z.string().min(50).max(20000),
  age_group: z.enum(["infant", "child", "teen", "adult", "senior", "elder"]),
  urgency: z.enum(["routine", "within_4_weeks", "within_1_week"]),
  investigations_done: z.array(z.string()).max(30),
  treatments_tried: z.string().max(10000).nullable().optional(),
  policyholder_ref: z.string().max(200).nullable().optional(),
});

async function requireInsurer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { supabase, user: null as null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.role !== "insurer") {
    return { supabase, user: null as null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { supabase, user, error: null as null };
}

export async function GET(request: Request) {
  const r = await requireInsurer();
  if (r.error) return r.error;
  const { supabase, user } = r;

  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get("specialty");
  const status = searchParams.get("status");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let q = supabase
    .from("insurer_cases")
    .select(
      "id, specialty, urgency, status, policyholder_ref, created_at, condition_summary",
    )
    .eq("insurer_id", user!.id)
    .order("created_at", { ascending: false });

  if (specialty && ["cardiology", "oncology", "orthopaedics"].includes(specialty)) {
    q = q.eq("specialty", specialty);
  }
  if (status && ["submitted", "matched", "closed"].includes(status)) {
    q = q.eq("status", status);
  }
  if (from) {
    q = q.gte("created_at", from);
  }
  if (to) {
    q = q.lte("created_at", to);
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error("[insurer/cases GET]", error);
    return NextResponse.json({ error: "Could not list cases" }, { status: 500 });
  }

  return NextResponse.json({ cases: rows ?? [] });
}

export async function POST(request: Request) {
  const r = await requireInsurer();
  if (r.error) return r.error;
  const { user } = r;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: ip, error: ie } = await admin
    .from("insurer_profiles")
    .select("cases_used_month, cases_limit_month")
    .eq("id", user!.id)
    .maybeSingle();

  if (ie || !ip) {
    return NextResponse.json({ error: "Could not load insurer profile" }, { status: 500 });
  }

  const used = ip.cases_used_month ?? 0;
  const limit = Math.max(1, ip.cases_limit_month ?? 20);
  if (used >= limit) {
    return NextResponse.json(
      { error: "Monthly case limit reached. Your limit resets on the next billing cycle." },
      { status: 403 },
    );
  }

  const b = parsed.data;
  const { data: inserted, error: insErr } = await admin
    .from("insurer_cases")
    .insert({
      insurer_id: user!.id,
      case_manager_id: user!.id,
      specialty: b.specialty,
      condition_summary: b.condition_summary,
      age_group: b.age_group,
      urgency: b.urgency,
      investigations_done: b.investigations_done.length > 0 ? b.investigations_done : null,
      treatments_tried: b.treatments_tried?.trim() || null,
      policyholder_ref: b.policyholder_ref?.trim() || null,
      status: "submitted",
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted?.id) {
    console.error("[insurer/cases POST] insert", insErr);
    return NextResponse.json({ error: "Could not create case" }, { status: 500 });
  }

  const { error: upErr } = await admin
    .from("insurer_profiles")
    .update({ cases_used_month: used + 1 })
    .eq("id", user!.id);

  if (upErr) {
    console.error("[insurer/cases POST] usage increment", upErr);
  }

  const match = await invokeMatchSpecialistsEdge({
    insurer_case_id: inserted.id,
    user_id: user!.id,
  });

  return NextResponse.json({
    id: inserted.id,
    match: match.ok
      ? { ok: true, count: match.count ?? 0 }
      : { ok: false, error: match.error ?? "Match failed" },
  });
}
