import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminUser } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { sendSpecialistApprovedEmail, sendSpecialistRejectedEmail } from "@/lib/admin/emails";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().min(5).max(4000).optional(),
});

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
  const [{ data: profile }, { data: spec }, { data: docs }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email, phone, country").eq("id", id).maybeSingle(),
    admin.from("specialist_profiles").select("*").eq("id", id).maybeSingle(),
    admin
      .from("specialist_verification_documents")
      .select("id, storage_path, doc_type, original_filename, created_at")
      .eq("specialist_id", id),
  ]);

  if (!spec) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const signed: { id: string; doc_type: string; url: string; original_filename: string | null }[] =
    [];
  for (const d of docs ?? []) {
    const { data: urlData, error: se } = await admin.storage
      .from("specialist-verification")
      .createSignedUrl(d.storage_path, 3600);
    if (!se && urlData?.signedUrl) {
      signed.push({
        id: d.id,
        doc_type: d.doc_type,
        url: urlData.signedUrl,
        original_filename: d.original_filename,
      });
    }
  }

  return NextResponse.json({ profile, specialist: spec, documents: signed });
}

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
  const now = new Date().toISOString();

  if (parsed.data.action === "approve") {
    const { error } = await admin
      .from("specialist_profiles")
      .update({ verified: true, verification_date: now })
      .eq("id", id);
    if (error) {
      return NextResponse.json({ error: "Could not update" }, { status: 500 });
    }
    const { data: prof } = await admin.from("profiles").select("email, full_name").eq("id", id).maybeSingle();
    const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
    if (prof?.email) {
      await sendSpecialistApprovedEmail({
        to: prof.email,
        fullName: prof.full_name ?? "there",
        profileUrl: `${app}/specialist/profile`,
      });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await admin
    .from("specialist_profiles")
    .update({ verified: false, verification_date: null })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  const { data: prof } = await admin.from("profiles").select("email, full_name").eq("id", id).maybeSingle();
  const app = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
  if (prof?.email && parsed.data.reason) {
    await sendSpecialistRejectedEmail({
      to: prof.email,
      fullName: prof.full_name ?? "there",
      reason: parsed.data.reason,
      profileUrl: `${app}/specialist/profile`,
    });
  }

  return NextResponse.json({ ok: true });
}
