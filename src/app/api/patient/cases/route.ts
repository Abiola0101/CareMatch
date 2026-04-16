import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { durationToMonths } from "@/lib/cases/constants";
import { invokeMatchSpecialistsEdge } from "@/lib/match/invoke-edge";

export const dynamic = "force-dynamic";

const specialtyEnum = z.enum(["cardiology", "oncology", "orthopaedics"]);

const postSchema = z.object({
  specialties: z.array(specialtyEnum).min(1).max(3),
  condition_summary: z
    .string()
    .min(50, "Please write at least 50 characters so we can match you properly."),
  duration: z.enum(["lt_1m", "m1_6", "m6_12", "y1_2", "gt_2"]),
  urgency: z.enum(["routine", "within_4_weeks", "within_1_week"]),
  diagnosis_status: z.enum(["confirmed", "suspected", "unknown"]),
  treatments_tried: z.string().max(20000).nullable().optional(),
  additional_notes: z.string().max(20000).nullable().optional(),
  investigations: z.array(z.string()).max(40),
});

function titleForSpecialty(spec: string, when: string) {
  const m: Record<string, string> = {
    cardiology: "Cardiology case",
    oncology: "Oncology case",
    orthopaedics: "Orthopaedics case",
  };
  return `${m[spec] ?? "Care case"} — ${when}`;
}

export async function POST(request: Request) {
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

  if (profile?.role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const values = parsed.data;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: pp } = await admin
    .from("patient_profiles")
    .select("age_group")
    .eq("id", user.id)
    .maybeSingle();

  const when = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const rows = values.specialties.map((spec) => ({
    patient_id: user.id,
    specialty: spec,
    title: titleForSpecialty(spec, when),
    condition_summary: values.condition_summary,
    duration_months: durationToMonths(values.duration),
    urgency: values.urgency,
    age_group: pp?.age_group ?? null,
    investigations_done:
      values.investigations.length > 0 ? values.investigations : null,
    treatments_tried: values.treatments_tried?.trim() || null,
    diagnosis_status: values.diagnosis_status,
    additional_notes: values.additional_notes?.trim() || null,
    status: "active" as const,
  }));

  const { data: inserted, error: ie } = await admin
    .from("patient_cases")
    .insert(rows)
    .select("id");

  if (ie || !inserted?.length) {
    return NextResponse.json(
      { error: ie?.message ?? "Could not create case." },
      { status: 500 },
    );
  }

  const caseIds = inserted.map((r) => r.id);
  const matchWarnings: string[] = [];

  for (const id of caseIds) {
    const result = await invokeMatchSpecialistsEdge({
      case_id: id,
      user_id: user.id,
    });
    if (!result.ok) {
      matchWarnings.push(result.error ?? `Match failed for case ${id}`);
    }
  }

  return NextResponse.json({ case_ids: caseIds, match_warnings: matchWarnings });
}
