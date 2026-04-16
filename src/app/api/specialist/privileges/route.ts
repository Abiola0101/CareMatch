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

const postSchema = z.object({
  hospital_id: z.string().uuid().nullable().optional(),
  institution_name: z.string().min(1).max(300).nullable().optional(),
  city: z.string().min(1).max(120).nullable().optional(),
  country: z.string().min(1).max(120).nullable().optional(),
  privilege_type: privilegeType,
  procedures_text: z.string().max(4000).optional(),
  capacity_pct: z.number().int().min(0).max(100).nullable().optional(),
});

function parseProcedures(text: string | undefined): string[] | null {
  if (!text?.trim()) return null;
  return text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

export async function GET() {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const { data: rows, error } = await supabase
    .from("specialist_hospital_privileges")
    .select(
      "id, hospital_id, institution_name, city, country, privilege_type, procedures, capacity_pct, verified, created_at",
    )
    .eq("specialist_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[specialist/privileges GET]", error);
    return NextResponse.json({ error: "Could not load privileges" }, { status: 500 });
  }

  const hospitalIds = Array.from(
    new Set((rows ?? []).map((r) => r.hospital_id).filter((id): id is string => !!id)),
  );

  let hospitalById = new Map<string, { institution_name: string; city: string; country: string }>();
  if (hospitalIds.length > 0) {
    const { data: hp } = await supabase
      .from("hospital_profiles")
      .select("id, institution_name, city, country")
      .in("id", hospitalIds);
    hospitalById = new Map(
      (hp ?? []).map((h) => [
        h.id,
        { institution_name: h.institution_name, city: h.city, country: h.country },
      ]),
    );
  }

  const items = (rows ?? []).map((r) => {
    const linked = r.hospital_id ? hospitalById.get(r.hospital_id) : undefined;
    return {
      ...r,
      hospital_display:
        linked?.institution_name ??
        r.institution_name ??
        null,
      hospital_city: linked?.city ?? r.city ?? null,
      hospital_country: linked?.country ?? r.country ?? null,
    };
  });

  return NextResponse.json({ privileges: items });
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
  const hasHospital = !!b.hospital_id;
  const hasText =
    (b.institution_name?.trim().length ?? 0) > 0 &&
    (b.city?.trim().length ?? 0) > 0 &&
    (b.country?.trim().length ?? 0) > 0;

  if (!hasHospital && !hasText) {
    return NextResponse.json(
      { error: "Provide hospital_id or institution name, city, and country" },
      { status: 400 },
    );
  }

  const insert = {
    specialist_id: userId,
    hospital_id: hasHospital ? b.hospital_id! : null,
    institution_name: hasHospital ? null : b.institution_name!.trim(),
    city: hasHospital ? null : b.city!.trim(),
    country: hasHospital ? null : b.country!.trim(),
    privilege_type: b.privilege_type,
    procedures: parseProcedures(b.procedures_text) as string[] | null,
    capacity_pct: b.capacity_pct ?? null,
    verified: false,
  };

  const { data: created, error } = await supabase
    .from("specialist_hospital_privileges")
    .insert(insert)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[specialist/privileges POST]", error);
    return NextResponse.json({ error: "Could not add privilege" }, { status: 500 });
  }

  return NextResponse.json({ id: created?.id });
}
