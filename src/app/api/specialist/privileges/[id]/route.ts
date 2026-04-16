import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

const privilegeType = z.enum([
  "full_surgical",
  "active_surgical",
  "consulting",
  "visiting_surgical",
]);

const putSchema = z.object({
  hospital_id: z.string().uuid().nullable().optional(),
  institution_name: z.string().min(1).max(300).nullable().optional(),
  city: z.string().min(1).max(120).nullable().optional(),
  country: z.string().min(1).max(120).nullable().optional(),
  privilege_type: privilegeType.optional(),
  procedures_text: z.string().max(4000).optional(),
  capacity_pct: z.number().int().min(0).max(100).nullable().optional(),
});

function parseProcedures(text: string | undefined): string[] | null | undefined {
  if (text === undefined) return undefined;
  if (!text.trim()) return null;
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const id = params.id;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const { data: existing, error: fe } = await supabase
    .from("specialist_hospital_privileges")
    .select("id, hospital_id")
    .eq("id", id)
    .eq("specialist_id", userId)
    .maybeSingle();

  if (fe || !existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const b = parsed.data;
  const patch: Record<string, unknown> = {};

  if (b.privilege_type !== undefined) patch.privilege_type = b.privilege_type;
  if (b.capacity_pct !== undefined) patch.capacity_pct = b.capacity_pct;
  const proc = parseProcedures(b.procedures_text);
  if (proc !== undefined) patch.procedures = proc;

  if (b.hospital_id !== undefined) {
    if (b.hospital_id) {
      patch.hospital_id = b.hospital_id;
      patch.institution_name = null;
      patch.city = null;
      patch.country = null;
    } else if (
      b.institution_name !== undefined &&
      b.city !== undefined &&
      b.country !== undefined
    ) {
      const inst = b.institution_name ?? "";
      const cty = b.city ?? "";
      const ctry = b.country ?? "";
      const ok = inst.trim().length > 0 && cty.trim().length > 0 && ctry.trim().length > 0;
      if (!ok) {
        return NextResponse.json(
          { error: "Institution name, city, and country are required when not linking a hospital" },
          { status: 400 },
        );
      }
      patch.hospital_id = null;
      patch.institution_name = inst.trim();
      patch.city = cty.trim();
      patch.country = ctry.trim();
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("specialist_hospital_privileges")
    .update(patch)
    .eq("id", id)
    .eq("specialist_id", userId);

  if (error) {
    console.error("[specialist/privileges/[id] PUT]", error);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

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

  const { data: removed, error } = await supabase
    .from("specialist_hospital_privileges")
    .delete()
    .eq("id", id)
    .eq("specialist_id", userId)
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Could not delete" }, { status: 500 });
  }
  if (!removed?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
