import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { ensureRoleChildProfilesWithServiceRole } from "@/lib/auth/role-profiles";

const VALID_ROLES = ["patient", "specialist", "insurer"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(value: unknown): value is ValidRole {
  return VALID_ROLES.includes(value as ValidRole);
}

export async function POST(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role } = body as { role?: unknown };

  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be one of: patient, specialist, insurer" },
      { status: 400 }
    );
  }

  // Check if role is already set
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role) {
    return NextResponse.json({ error: "Role already set" }, { status: 400 });
  }

  // Update the profiles table with the new role using service role to bypass RLS
  const admin = createServiceRoleClient();

  const { error: updateError } = await admin
    .from("profiles")
    .update({ role })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Ensure role-specific child profile row exists
  const { error: childError } = await ensureRoleChildProfilesWithServiceRole(
    user.id,
    role
  );

  if (childError) {
    console.error("[set-role] ensureRoleChildProfiles failed:", childError);
    // Non-fatal — profile row was set; child profile creation can be retried later
  }

  return NextResponse.json({ ok: true });
}
