import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

const BUCKET = "specialist-verification";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const id = params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const { data: row, error: fe } = await supabase
    .from("specialist_verification_documents")
    .select("id, storage_path")
    .eq("id", id)
    .eq("specialist_id", userId)
    .maybeSingle();

  if (fe || !row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { error: re } = await admin.storage.from(BUCKET).remove([row.storage_path]);
  if (re) {
    console.error("[specialist/verification-documents DELETE] storage", re);
  }

  const { error: de } = await supabase
    .from("specialist_verification_documents")
    .delete()
    .eq("id", id)
    .eq("specialist_id", userId);

  if (de) {
    return NextResponse.json({ error: "Could not delete record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
