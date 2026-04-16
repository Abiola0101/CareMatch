import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { SpecialistAnalyticsDashboard } from "./analytics-dashboard";

export const dynamic = "force-dynamic";

export default async function SpecialistAnalyticsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "specialist") {
    redirect(dashboardPathForRole(profile?.role));
  }

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) {
    redirect("/onboarding/subscription");
  }

  return <SpecialistAnalyticsDashboard />;
}
