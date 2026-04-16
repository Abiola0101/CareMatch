import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const r = await requireAdminUser();
  if ("error" in r) return r.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let query = admin
    .from("profiles")
    .select("id, full_name, email, role, created_at, suspended_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (q.length >= 2) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data: profiles, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not search" }, { status: 500 });
  }

  const ids = (profiles ?? []).map((p) => p.id);
  const tierBy = new Map<string, string | null>();

  if (ids.length > 0) {
    const [pp, sp, hp, ip] = await Promise.all([
      admin.from("patient_profiles").select("id, subscription_tier").in("id", ids),
      admin.from("specialist_profiles").select("id, subscription_tier").in("id", ids),
      admin.from("hospital_profiles").select("id, subscription_tier").in("id", ids),
      admin.from("insurer_profiles").select("id, subscription_tier").in("id", ids),
    ]);
    for (const row of pp.data ?? []) tierBy.set(row.id, row.subscription_tier);
    for (const row of sp.data ?? []) tierBy.set(row.id, row.subscription_tier);
    for (const row of hp.data ?? []) tierBy.set(row.id, row.subscription_tier);
    for (const row of ip.data ?? []) tierBy.set(row.id, row.subscription_tier);
  }

  return NextResponse.json({
    users: (profiles ?? []).map((p) => ({
      ...p,
      subscription_tier: tierBy.get(p.id) ?? null,
    })),
  });
}
