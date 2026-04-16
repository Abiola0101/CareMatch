import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { durationToMonths } from "@/lib/cases/constants";
import {
  patientCaseWriteSchema,
  titleForSpecialty,
} from "@/lib/cases/patient-case-api";
import { invokeMatchSpecialistsEdge } from "@/lib/match/invoke-edge";

export const dynamic = "force-dynamic";

const postSchema = patientCaseWriteSchema;

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

  if (profile?.role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: cases, error } = await supabase
    .from("patient_cases")
    .select("*")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[patient/cases GET]", error);
    return NextResponse.json({ error: "Could not load cases" }, { status: 500 });
  }

  return NextResponse.json({ cases: cases ?? [] });
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
