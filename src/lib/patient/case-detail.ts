import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type CareModeRow = {
  mode: string;
  available: string | null;
  detail: string | null;
  fee_range: string | null;
  wait_days: number | null;
};

export type HospitalPrivilegeRow = {
  id: string;
  hospital_id: string | null;
  privilege_type: string | null;
  verified: boolean | null;
  institution_name: string;
  city: string | null;
  country: string | null;
  procedures: string[] | null;
  capacity_pct: number | null;
};

export type MatchResultDetail = {
  id: string;
  specialist_id: string;
  match_score: number | null;
  score_clinical: number | null;
  score_subspec: number | null;
  score_volume: number | null;
  score_outcomes: number | null;
  score_avail: number | null;
  rank_position: number | null;
  full_name: string;
  title: string | null;
  specialty: string | null;
  sub_specialties: string[] | null;
  institution: string | null;
  city: string | null;
  country: string | null;
  case_volume_annual: number | null;
  languages: string[] | null;
  willing_to_travel: boolean;
  travel_note: string | null;
  care_modes: CareModeRow[];
  hospital_privileges: HospitalPrivilegeRow[];
};

export type PatientCaseDetail = {
  case: {
    id: string;
    specialty: string | null;
    title: string | null;
    condition_summary: string | null;
    duration_months: number | null;
    urgency: string | null;
    diagnosis_status: string | null;
    additional_notes: string | null;
    investigations_done: string[] | null;
    treatments_tried: string | null;
    status: string;
    created_at: string;
  };
  matches: MatchResultDetail[];
};

export async function loadPatientCaseDetail(
  caseId: string,
): Promise<PatientCaseDetail | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: c, error } = await supabase
    .from("patient_cases")
    .select("*")
    .eq("id", caseId)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (error || !c) {
    return null;
  }

  const admin = createServiceRoleClient();

  const { data: matchRows } = await admin
    .from("match_results")
    .select("*")
    .eq("case_id", caseId)
    .order("rank_position", { ascending: true });

  const matchesList = matchRows ?? [];
  const specIds = Array.from(
    new Set(matchesList.map((m) => m.specialist_id)),
  );

  if (specIds.length === 0) {
    return {
      case: {
        id: c.id,
        specialty: c.specialty,
        title: c.title,
        condition_summary: c.condition_summary,
        duration_months: c.duration_months,
        urgency: c.urgency,
        diagnosis_status: c.diagnosis_status,
        additional_notes: c.additional_notes,
        investigations_done: c.investigations_done,
        treatments_tried: c.treatments_tried,
        status: c.status,
        created_at: c.created_at,
      },
      matches: [],
    };
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", specIds);

  const { data: specialists } = await admin
    .from("specialist_profiles")
    .select(
      "id, title, specialty, sub_specialties, institution, city, country, case_volume_annual, languages, willing_to_travel, travel_note",
    )
    .in("id", specIds);

  const { data: careModeRows } = await admin
    .from("specialist_care_modes")
    .select(
      "specialist_id, mode, available, detail, fee_range, wait_days",
    )
    .in("specialist_id", specIds);

  const { data: privRows } = await admin
    .from("specialist_hospital_privileges")
    .select(
      "id, specialist_id, hospital_id, institution_name, city, country, privilege_type, verified, procedures, capacity_pct",
    )
    .in("specialist_id", specIds);

  const hospitalIds = Array.from(
    new Set(
      (privRows ?? [])
        .map((p) => p.hospital_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: hospitals } = await admin
    .from("hospital_profiles")
    .select("id, institution_name, city, country")
    .in("id", hospitalIds);

  const hospitalMap = new Map(
    (hospitals ?? []).map((h) => [
      h.id,
      {
        institution_name: h.institution_name,
        city: h.city,
        country: h.country,
      },
    ]),
  );

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string]),
  );
  const specMap = new Map((specialists ?? []).map((s) => [s.id, s]));

  const careBySpec = new Map<string, CareModeRow[]>();
  for (const row of careModeRows ?? []) {
    const list = careBySpec.get(row.specialist_id) ?? [];
    list.push({
      mode: row.mode as string,
      available: row.available,
      detail: row.detail,
      fee_range: row.fee_range ?? null,
      wait_days: row.wait_days ?? null,
    });
    careBySpec.set(row.specialist_id, list);
  }

  const privBySpec = new Map<string, HospitalPrivilegeRow[]>();
  for (const pr of privRows ?? []) {
    const h = pr.hospital_id ? hospitalMap.get(pr.hospital_id) : null;
    const prExt = pr as {
      institution_name?: string | null;
      city?: string | null;
      country?: string | null;
    };
    const list = privBySpec.get(pr.specialist_id) ?? [];
    list.push({
      id: pr.id,
      hospital_id: pr.hospital_id,
      privilege_type: pr.privilege_type,
      verified: pr.verified,
      institution_name: h?.institution_name ?? prExt.institution_name ?? "Hospital",
      city: h?.city ?? prExt.city ?? null,
      country: h?.country ?? prExt.country ?? null,
      procedures: pr.procedures ?? null,
      capacity_pct: pr.capacity_pct ?? null,
    });
    privBySpec.set(pr.specialist_id, list);
  }

  const matches: MatchResultDetail[] = matchesList.map((m) => {
    const sp = specMap.get(m.specialist_id);
    return {
      id: m.id,
      specialist_id: m.specialist_id,
      match_score: m.match_score,
      score_clinical: m.score_clinical,
      score_subspec: m.score_subspec,
      score_volume: m.score_volume,
      score_outcomes: m.score_outcomes,
      score_avail: m.score_avail,
      rank_position: m.rank_position,
      full_name: nameMap.get(m.specialist_id) ?? "Specialist",
      title: sp?.title ?? null,
      specialty: sp?.specialty ?? null,
      sub_specialties: sp?.sub_specialties ?? null,
      institution: sp?.institution ?? null,
      city: sp?.city ?? null,
      country: sp?.country ?? null,
      case_volume_annual: sp?.case_volume_annual ?? null,
      languages: sp?.languages ?? null,
      willing_to_travel: sp?.willing_to_travel ?? false,
      travel_note: sp?.travel_note ?? null,
      care_modes: careBySpec.get(m.specialist_id) ?? [],
      hospital_privileges: privBySpec.get(m.specialist_id) ?? [],
    };
  });

  return {
    case: {
      id: c.id,
      specialty: c.specialty,
      title: c.title,
      condition_summary: c.condition_summary,
      duration_months: c.duration_months,
      urgency: c.urgency,
      diagnosis_status: c.diagnosis_status,
      additional_notes: c.additional_notes,
      investigations_done: c.investigations_done,
      treatments_tried: c.treatments_tried,
      status: c.status,
      created_at: c.created_at,
    },
    matches,
  };
}
