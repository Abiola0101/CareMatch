import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type SignupRole = "patient" | "specialist" | "insurer";

/**
 * Ensures patient/specialist/hospital/insurer child row exists using the service role
 * (bypasses RLS). Call after signup and after OAuth callback so rows exist even if the
 * DB trigger did not run or was blocked by RLS before row_security was disabled.
 */
export async function ensureRoleChildProfilesWithServiceRole(
  userId: string,
  role: SignupRole | "admin",
): Promise<{ error: Error | null }> {
  if (role === "admin") {
    return { error: null };
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch (e) {
    return { error: e instanceof Error ? e : new Error("Service role not configured") };
  }

  const ignoreConflict = (err: { code?: string } | null) =>
    err && err.code === "23505" ? null : err;

  switch (role) {
    case "patient": {
      const { error } = await admin.from("patient_profiles").insert({
        id: userId,
        primary_country: "Pending",
      });
      return { error: ignoreConflict(error) ? new Error(error!.message) : null };
    }
    case "specialist": {
      const { error } = await admin.from("specialist_profiles").insert({
        id: userId,
        verified: false,
        is_accepting: true,
      });
      return { error: ignoreConflict(error) ? new Error(error!.message) : null };
    }
    case "insurer": {
      const { error } = await admin.from("insurer_profiles").insert({
        id: userId,
        company_name: "Pending",
      });
      return { error: ignoreConflict(error) ? new Error(error!.message) : null };
    }
  }
}

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
      return supabase.from("specialist_profiles").insert({
        id: userId,
        verified: false,
        is_accepting: true,
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
    role !== "insurer"
  ) {
    return { error: null };
  }

  const table =
    role === "patient"
      ? "patient_profiles"
      : role === "specialist"
        ? "specialist_profiles"
        : "insurer_profiles";

  const { data: existing } = await supabase
    .from(table)
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existing) {
    return { error: null };
  }

  const ins = await insertRoleSpecificProfile(supabase, userId, role);
  if (!ins.error) {
    return ins;
  }

  const { error: fe } = await ensureRoleChildProfilesWithServiceRole(userId, role);
  if (!fe) {
    return { ...ins, error: null };
  }
  console.error("[ensureRoleSpecificProfile] insert and service-role fallback failed", fe);
  return ins;
}
