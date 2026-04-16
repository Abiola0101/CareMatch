import type { SupabaseClient } from "@supabase/supabase-js";

/** True when patient still needs to complete onboarding profile (before cases). */
export async function patientProfileIncomplete(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("patient_profiles")
    .select("date_of_birth, primary_country")
    .eq("id", userId)
    .maybeSingle();

  if (!data) {
    return true;
  }
  if (!data.date_of_birth) {
    return true;
  }
  const c = data.primary_country?.trim();
  if (!c || c === "Pending") {
    return true;
  }
  return false;
}
