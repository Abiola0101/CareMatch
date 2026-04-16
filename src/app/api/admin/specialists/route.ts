import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const r = await requireAdminUser();
  if ("error" in r) return r.error;

  const { searchParams } = new URL(request.url);
  const verifiedParam = searchParams.get("verified");
  const verified =
    verifiedParam === "true" ? true : verifiedParam === "false" ? false : null;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let q = admin
    .from("specialist_profiles")
    .select("id, title, specialty, institution, verified, verification_date, created_at")
    .order("created_at", { ascending: false });

  if (verified !== null) {
    q = q.eq("verified", verified);
  }

  const { data: specs, error } = await q;
  if (error) {
    console.error("[admin/specialists GET]", error);
    return NextResponse.json({ error: "Could not load" }, { status: 500 });
  }

  const ids = (specs ?? []).map((s) => s.id);
  if (ids.length === 0) {
    return NextResponse.json({ specialists: [] });
  }

  const { data: profiles } = await admin.from("profiles").select("id, full_name, email").in("id", ids);

  const profBy = new Map((profiles ?? []).map((p) => [p.id, p]));

  const items = (specs ?? []).map((s) => ({
    ...s,
    full_name: profBy.get(s.id)?.full_name ?? null,
    email: profBy.get(s.id)?.email ?? null,
  }));

  return NextResponse.json({ specialists: items });
}
