import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  sendHospitalApprovedEmail,
  sendHospitalRejectedEmail,
} from "@/lib/admin/emails";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  /** Required when action is reject (min length enforced by Zod when present). */
  reason: z.string().min(5).max(4000).optional(),
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
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  if (parsed.data.action === "reject" && !parsed.data.reason?.trim()) {
    return NextResponse.json({ error: "reason is required for reject" }, { status: 400 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const id = params.id;
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  const dashboardUrl = `${appBase}/hospital/dashboard`;

  const [{ data: hp }, { data: prof }] = await Promise.all([
    admin
      .from("hospital_profiles")
      .select("institution_name")
      .eq("id", id)
      .maybeSingle(),
    admin.from("profiles").select("email, full_name").eq("id", id).maybeSingle(),
  ]);

  if (!hp) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.action === "approve") {
    const { error } = await admin
      .from("hospital_profiles")
      .update({ verified: true })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: "Could not update" }, { status: 500 });
    }

    if (prof?.email) {
      await sendHospitalApprovedEmail({
        to: prof.email,
        contactName: prof.full_name?.trim() || "there",
        institutionName: hp.institution_name,
        dashboardUrl,
      });
    }

    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("hospital_profiles")
    .update({ verified: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  if (prof?.email && parsed.data.reason) {
    await sendHospitalRejectedEmail({
      to: prof.email,
      contactName: prof.full_name?.trim() || "there",
      institutionName: hp.institution_name,
      reason: parsed.data.reason,
      dashboardUrl,
    });
  }

  return NextResponse.json({ ok: true });
}
