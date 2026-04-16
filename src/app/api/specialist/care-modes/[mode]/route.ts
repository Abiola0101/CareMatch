import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

const modeParam = z.enum(["remote", "telemedicine", "medical_travel", "fly_doctor"]);
const availSchema = z.enum(["yes", "no", "conditional"]);

const putSchema = z.object({
  available: availSchema,
  detail: z.string().max(5000).nullable().optional(),
  fee_range: z.string().max(200).nullable().optional(),
  wait_days: z.number().int().min(0).max(730).nullable().optional(),
});

export async function PUT(
  request: Request,
  { params }: { params: { mode: string } },
) {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const modeParsed = modeParam.safeParse(params.mode);
  if (!modeParsed.success) {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }
  const mode = modeParsed.data;

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

  const b = parsed.data;
  const { error } = await supabase
    .from("specialist_care_modes")
    .upsert(
      {
        specialist_id: userId,
        mode,
        available: b.available,
        detail: b.detail ?? null,
        fee_range: b.fee_range ?? null,
        wait_days: b.wait_days ?? null,
      },
      { onConflict: "specialist_id,mode" },
    );

  if (error) {
    console.error("[specialist/care-modes/[mode] PUT]", error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
