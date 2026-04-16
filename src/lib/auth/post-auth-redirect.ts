import type { SupabaseClient } from "@supabase/supabase-js";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { patientProfileIncomplete } from "@/lib/auth/patient-profile";
import { getProfileRole, hasActivePlatformAccess } from "@/lib/auth/subscription";

export async function resolveAuthenticatedDestination(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const access = await hasActivePlatformAccess(supabase, userId);
  if (!access) {
    return "/onboarding/subscription";
  }
  const role = await getProfileRole(supabase, userId);
  if (role === "patient") {
    const incomplete = await patientProfileIncomplete(supabase, userId);
    if (incomplete) {
      return "/onboarding/profile";
    }
  }
  return dashboardPathForRole(role);
}
