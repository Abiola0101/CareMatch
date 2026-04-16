import type { SupabaseClient } from "@supabase/supabase-js";

export type SignupRole = "patient" | "specialist" | "hospital" | "insurer";

export async function insertRoleSpecificProfile(
  supabase: SupabaseClient,
  userId: string,
  role: SignupRole
) {
  switch (role) {
    case "patient":
      return supabase.from("patient_profiles").insert({
        id: userId,
        primary_country: "Pending",
      });
    case "specialist":
      return supabase.from("specialist_profiles").insert({ id: userId });
    case "hospital":
      return supabase.from("hospital_profiles").insert({
        id: userId,
        institution_name: "Pending",
        city: "Pending",
        country: "Pending",
      });
    case "insurer":
      return supabase.from("insurer_profiles").insert({
        id: userId,
        company_name: "Pending",
      });
  }
}

/** Ensures a role-specific row exists for OAuth / recovery flows. */
export async function ensureRoleSpecificProfile(
  supabase: SupabaseClient,
  userId: string,
  role: string
) {
  if (
    role !== "patient" &&
    role !== "specialist" &&
    role !== "hospital" &&
    role !== "insurer"
  ) {
    return { error: null };
  }

  const table =
    role === "patient"
      ? "patient_profiles"
      : role === "specialist"
        ? "specialist_profiles"
        : role === "hospital"
          ? "hospital_profiles"
          : "insurer_profiles";

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return { error: null };
  }

  return insertRoleSpecificProfile(supabase, userId, role);
}
