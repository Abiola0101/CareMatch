import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { SpecialistProfileEditor } from "./specialist-profile-editor";

export const dynamic = "force-dynamic";

export default async function SpecialistProfilePage() {
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

  return <SpecialistProfileEditor />;
}
