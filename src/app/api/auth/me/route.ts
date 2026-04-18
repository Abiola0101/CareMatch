import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const role = profile.role as string;

  const tableMap: Record<string, string> = {
    patient: "patient_profiles",
    specialist: "specialist_profiles",
    hospital: "hospital_profiles",
    insurer: "insurer_profiles",
  };

  const table = tableMap[role];
  if (!table) {
    return NextResponse.json({ role, stripe_sub_id: null });
  }

  const { data: roleProfile } = await admin
    .from(table as "patient_profiles")
    .select("stripe_sub_id")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    role,
    full_name: profile.full_name,
    stripe_sub_id: (roleProfile as { stripe_sub_id?: string | null } | null)
      ?.stripe_sub_id ?? null,
  });
}
