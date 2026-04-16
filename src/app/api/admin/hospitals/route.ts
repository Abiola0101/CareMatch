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
    .from("hospital_profiles")
    .select("id, institution_name, city, country, verified, created_at")
    .order("created_at", { ascending: false });

  if (verified !== null) {
    q = q.eq("verified", verified);
  }

  const { data: rows, error } = await q;
  if (error) {
    return NextResponse.json({ error: "Could not load" }, { status: 500 });
  }

  const ids = (rows ?? []).map((h) => h.id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] as { id: string; full_name: string; email: string }[] };

  const profBy = new Map((profiles ?? []).map((p) => [p.id, p]));

  return NextResponse.json({
    hospitals: (rows ?? []).map((h) => ({
      ...h,
      full_name: profBy.get(h.id)?.full_name ?? null,
      email: profBy.get(h.id)?.email ?? null,
    })),
  });
}
