import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { durationToMonths } from "@/lib/cases/constants";
import {
  patientCaseWriteSchema,
  titleForSpecialty,
} from "@/lib/cases/patient-case-api";

export const dynamic = "force-dynamic";

const caseWithMatchesSelect = `
  *,
  match_results (
    specialist_id,
    match_score,
    score_clinical,
    score_subspec,
    score_volume,
    score_outcomes,
    score_avail,
    rank_position
  )
`;

type CaseWithMatchesRow = Record<string, unknown> & {
  match_results?: Array<Record<string, unknown>> | null;
};

function splitCaseRow(row: CaseWithMatchesRow) {
  const { match_results: mr, ...caseRow } = row;
  const list = Array.isArray(mr) ? [...mr] : [];
  list.sort((a, b) => {
    const ra = typeof a.rank_position === "number" ? a.rank_position : 9999;
    const rb = typeof b.rank_position === "number" ? b.rank_position : 9999;
    return ra - rb;
  });
  return {
    case: caseRow,
    match_results: list,
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
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

  const { data, error } = await supabase
    .from("patient_cases")
    .select(caseWithMatchesSelect)
    .eq("id", params.id)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[patient/cases/[id] GET]", error);
    return NextResponse.json({ error: "Could not load case" }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(splitCaseRow(data as CaseWithMatchesRow));
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
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

  const parsed = patientCaseWriteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const primarySpecialty = values.specialties[0]!;

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

  const { data: updated, error: ue } = await supabase
    .from("patient_cases")
    .update({
      specialty: primarySpecialty,
      title: titleForSpecialty(primarySpecialty, when),
      condition_summary: values.condition_summary,
      duration_months: durationToMonths(values.duration),
      urgency: values.urgency,
      age_group: pp?.age_group ?? null,
      investigations_done:
        values.investigations.length > 0 ? values.investigations : null,
      treatments_tried: values.treatments_tried?.trim() || null,
      diagnosis_status: values.diagnosis_status,
      additional_notes: values.additional_notes?.trim() || null,
    })
    .eq("id", params.id)
    .eq("patient_id", user.id)
    .select("id")
    .maybeSingle();

  if (ue) {
    console.error("[patient/cases/[id] PUT]", ue);
    return NextResponse.json({ error: "Could not update case" }, { status: 500 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  let matchWarning: string | null = null;

  if (!session?.access_token) {
    matchWarning = "Session missing; matching was not re-run.";
  } else {
    try {
      const matchRes = await fetch(`${appBase}/api/match/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ case_id: params.id }),
      });
      const raw = await matchRes.text();
      let payload: { error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { error?: string };
        } catch {
          matchWarning = "Matching returned an unreadable response.";
        }
      }
      if (!matchRes.ok) {
        matchWarning = payload.error ?? `Matching failed (${matchRes.status})`;
      }
    } catch (e) {
      console.error("[patient/cases/[id] PUT] match/run fetch", e);
      matchWarning = "Matching request failed.";
    }
  }

  const { data: refreshed, error: reErr } = await supabase
    .from("patient_cases")
    .select(caseWithMatchesSelect)
    .eq("id", params.id)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (reErr || !refreshed) {
    return NextResponse.json(
      {
        error: "Case updated but could not reload details.",
        match_warning: matchWarning,
      },
      { status: 500 },
    );
  }

  const body = splitCaseRow(refreshed as CaseWithMatchesRow);
  return NextResponse.json({
    ...body,
    ...(matchWarning ? { match_warning: matchWarning } : {}),
  });
}
