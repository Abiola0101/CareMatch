import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

const BUCKET = "specialist-verification";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

const docType = z.enum(["medical_license", "credential_certificate", "privilege_letter"]);

const postSchema = z.object({
  storage_path: z.string().min(3).max(500),
  doc_type: docType,
  original_filename: z.string().max(255).nullable().optional(),
  file_size: z.number().int().min(1).max(MAX_BYTES),
  mime_type: z.string().max(120),
});

export async function GET() {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const { data, error } = await supabase
    .from("specialist_verification_documents")
    .select("id, storage_path, doc_type, original_filename, file_size, mime_type, created_at")
    .eq("specialist_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[specialist/verification-documents GET]", error);
    return NextResponse.json({ error: "Could not load documents" }, { status: 500 });
  }

  return NextResponse.json({ documents: data ?? [] });
}

export async function POST(request: Request) {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const b = parsed.data;
  if (!ALLOWED_MIME.has(b.mime_type)) {
    return NextResponse.json(
      { error: "Only PDF, JPEG, and PNG files are allowed" },
      { status: 400 },
    );
  }

  const prefix = `${userId}/`;
  if (!b.storage_path.startsWith(prefix)) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }

  const { data: inserted, error } = await supabase
    .from("specialist_verification_documents")
    .insert({
      specialist_id: userId,
      storage_path: b.storage_path,
      doc_type: b.doc_type,
      original_filename: b.original_filename ?? null,
      file_size: b.file_size,
      mime_type: b.mime_type,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[specialist/verification-documents POST]", error);
    return NextResponse.json({ error: "Could not register upload" }, { status: 500 });
  }

  return NextResponse.json({ id: inserted?.id });
}
