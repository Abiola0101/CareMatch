import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

const modeSchema = z.enum(["remote", "telemedicine", "medical_travel", "fly_doctor"]);
const availSchema = z.enum(["yes", "no", "conditional"]);

const rowSchema = z.object({
  mode: modeSchema,
  available: availSchema,
  detail: z.string().max(5000).nullable().optional(),
  fee_range: z.string().max(200).nullable().optional(),
  wait_days: z.number().int().min(0).max(730).nullable().optional(),
});

const postSchema = z.object({
  modes: z.array(rowSchema).min(1).max(8),
  willing_to_travel: z.boolean().optional(),
  travel_note: z.string().max(5000).nullable().optional(),
});

export async function GET() {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const [{ data: modes, error: me }, { data: spec, error: se }] = await Promise.all([
    supabase
      .from("specialist_care_modes")
      .select("id, mode, available, detail, fee_range, wait_days")
      .eq("specialist_id", userId),
    supabase
      .from("specialist_profiles")
      .select("willing_to_travel, travel_note")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (me || se) {
    return NextResponse.json({ error: "Could not load care modes" }, { status: 500 });
  }

  return NextResponse.json({
    modes: modes ?? [],
    willing_to_travel: spec?.willing_to_travel ?? false,
    travel_note: spec?.travel_note ?? null,
  });
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

  const { modes, willing_to_travel, travel_note } = parsed.data;

  const upsertRows = modes.map((m) => ({
    specialist_id: userId,
    mode: m.mode,
    available: m.available,
    detail: m.detail ?? null,
    fee_range: m.fee_range ?? null,
    wait_days: m.wait_days ?? null,
  }));

  const { error: ue } = await supabase.from("specialist_care_modes").upsert(upsertRows, {
    onConflict: "specialist_id,mode",
  });

  if (ue) {
    console.error("[specialist/care-modes POST]", ue);
    return NextResponse.json({ error: "Could not save care modes" }, { status: 500 });
  }

  if (willing_to_travel !== undefined || travel_note !== undefined) {
    const patch: Record<string, unknown> = {};
    if (willing_to_travel !== undefined) patch.willing_to_travel = willing_to_travel;
    if (travel_note !== undefined) patch.travel_note = travel_note;
    const { error: pe } = await supabase.from("specialist_profiles").update(patch).eq("id", userId);
    if (pe) {
      console.error("[specialist/care-modes POST] travel fields", pe);
      return NextResponse.json({ error: "Could not save travel preferences" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
