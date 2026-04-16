import type { SupabaseClient } from "@supabase/supabase-js";

export async function hasActivePlatformAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile?.role) {
    return false;
  }

  if (profile.role === "admin") {
    return true;
  }

  const tableByRole: Record<string, "patient_profiles" | "specialist_profiles" | "hospital_profiles" | "insurer_profiles"> =
    {
      patient: "patient_profiles",
      specialist: "specialist_profiles",
      hospital: "hospital_profiles",
      insurer: "insurer_profiles",
    };

  const table = tableByRole[profile.role];
  if (!table) {
    return false;
  }

  const { data: row } = await supabase
    .from(table)
    .select("stripe_sub_id")
    .eq("id", userId)
    .maybeSingle();

  const subId = row?.stripe_sub_id;
  return typeof subId === "string" && subId.length > 0;
}

export async function getProfileRole(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return data?.role ?? null;
}
