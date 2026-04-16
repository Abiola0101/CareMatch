import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const r = await requireAdminUser();
  if ("error" in r) return r.error;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const id = params.id;

  const { data: profile, error: pe } = await admin
    .from("profiles")
    .select("id, full_name, email, phone, role, country, created_at, suspended_at, avatar_url")
    .eq("id", id)
    .maybeSingle();

  if (pe || !profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let roleProfile: Record<string, unknown> | null = null;
  const role = profile.role as string;

  if (role === "patient") {
    const { data } = await admin.from("patient_profiles").select("*").eq("id", id).maybeSingle();
    roleProfile = data as Record<string, unknown> | null;
  } else if (role === "specialist") {
    const { data } = await admin.from("specialist_profiles").select("*").eq("id", id).maybeSingle();
    roleProfile = data as Record<string, unknown> | null;
  } else if (role === "hospital") {
    const { data } = await admin.from("hospital_profiles").select("*").eq("id", id).maybeSingle();
    roleProfile = data as Record<string, unknown> | null;
  } else if (role === "insurer") {
    const { data } = await admin.from("insurer_profiles").select("*").eq("id", id).maybeSingle();
    roleProfile = data as Record<string, unknown> | null;
  }

  return NextResponse.json({ profile, roleProfile });
}
