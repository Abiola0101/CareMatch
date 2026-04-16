import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  suspended: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const r = await requireAdminUser();
  if ("error" in r) return r.error;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const suspended_at = parsed.data.suspended ? new Date().toISOString() : null;
  const { error } = await admin
    .from("profiles")
    .update({ suspended_at })
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
