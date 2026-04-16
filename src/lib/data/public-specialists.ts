import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PublicSpecialistRow = {
  id: string;
  full_name: string;
  title: string | null;
  specialty: string | null;
  sub_specialties: string[] | null;
  institution: string | null;
  city: string | null;
  country: string | null;
  case_volume_annual: number | null;
  languages: string[] | null;
};

export async function queryPublicSpecialists(params: {
  specialty?: string | null;
  country?: string | null;
  page?: number;
  limit?: number;
}): Promise<{
  items: PublicSpecialistRow[];
  total: number;
  page: number;
  limit: number;
}> {
  const admin = createServiceRoleClient();
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(50, Math.max(1, params.limit ?? 12));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let q = admin
    .from("specialist_profiles")
    .select(
      "id, title, specialty, sub_specialties, institution, city, country, case_volume_annual, languages",
      { count: "exact" },
    )
    .eq("verified", true)
    .eq("is_accepting", true);

  const spec = params.specialty?.trim();
  if (spec && spec !== "all") {
    q = q.eq("specialty", spec);
  }

  const country = params.country?.trim();
  if (country) {
    q = q.ilike("country", `%${country}%`);
  }

  const { data: specialists, error, count } = await q
    .order("case_volume_annual", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rows = specialists ?? [];
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    return { items: [], total: count ?? 0, page, limit };
  }

  const { data: profiles, error: pe } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", ids);

  if (pe) {
    throw pe;
  }

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name as string]),
  );

  const items: PublicSpecialistRow[] = rows.map((s) => ({
    id: s.id,
    full_name: nameById.get(s.id) ?? "Specialist",
    title: s.title,
    specialty: s.specialty,
    sub_specialties: s.sub_specialties,
    institution: s.institution,
    city: s.city,
    country: s.country,
    case_volume_annual: s.case_volume_annual,
    languages: s.languages,
  }));

  return {
    items,
    total: count ?? 0,
    page,
    limit,
  };
}
