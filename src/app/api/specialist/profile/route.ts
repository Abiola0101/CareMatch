import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

const videoUrl = z
  .union([z.string().url().max(500), z.literal(""), z.null()])
  .optional();

const putSchema = z.object({
  full_name: z.string().min(2).max(200).optional(),
  phone: z.string().max(50).nullable().optional(),
  profile_country: z.string().max(100).nullable().optional(),
  title: z.string().max(40).nullable().optional(),
  specialty: z.enum(["cardiology", "oncology", "orthopaedics"]).nullable().optional(),
  sub_specialties: z.array(z.string().max(80)).max(40).optional(),
  institution: z.string().max(300).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  country: z.string().max(120).nullable().optional(),
  years_experience: z.number().int().min(0).max(80).nullable().optional(),
  languages: z.array(z.string().max(40)).max(30).optional(),
  bio: z.string().max(500).nullable().optional(),
  profile_video_url: videoUrl,
  avg_clinic_wait_days: z.number().int().min(0).max(730).nullable().optional(),
  avg_proc_wait_days: z.number().int().min(0).max(730).nullable().optional(),
  is_accepting: z.boolean().optional(),
});

export async function GET() {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const { data: profile, error: pe } = await supabase
    .from("profiles")
    .select("full_name, email, phone, country, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const { data: spec, error: se } = await supabase
    .from("specialist_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (pe || se) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  return NextResponse.json({ profile, specialist: spec });
}

export async function PUT(request: Request) {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

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

  const profileUpdate: Record<string, unknown> = {};
  if (b.full_name !== undefined) profileUpdate.full_name = b.full_name;
  if (b.phone !== undefined) profileUpdate.phone = b.phone;
  if (b.profile_country !== undefined) profileUpdate.country = b.profile_country;

  if (Object.keys(profileUpdate).length > 0) {
    const { error: ue } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
    if (ue) {
      console.error("[specialist/profile PUT] profiles", ue);
      return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
    }
  }

  const specPatch: Record<string, unknown> = {};
  const specKeys = [
    "title",
    "specialty",
    "sub_specialties",
    "institution",
    "city",
    "country",
    "years_experience",
    "languages",
    "bio",
    "profile_video_url",
    "avg_clinic_wait_days",
    "avg_proc_wait_days",
    "is_accepting",
  ] as const;

  for (const k of specKeys) {
    if (b[k] !== undefined) {
      if (k === "profile_video_url") {
        const v = b.profile_video_url;
        specPatch[k] = v === "" || v === null ? null : v;
      } else {
        specPatch[k] = b[k];
      }
    }
  }

  if (Object.keys(specPatch).length > 0) {
    const { error: spe } = await supabase
      .from("specialist_profiles")
      .update(specPatch)
      .eq("id", userId);
    if (spe) {
      console.error("[specialist/profile PUT] specialist_profiles", spe);
      return NextResponse.json({ error: "Could not update specialist profile" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
