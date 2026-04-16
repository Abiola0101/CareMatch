import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { stripe } from "@/lib/stripe";
import { sendNewConnectionToSpecialist } from "@/lib/emails/connection-emails";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  case_id: z.string().uuid(),
  specialist_id: z.string().uuid(),
  preferred_mode: z.enum([
    "remote",
    "telemedicine",
    "medical_travel",
    "fly_doctor",
  ]),
  message: z.string().min(20).max(500),
  payment_intent_id: z.string().optional(),
});

const OVERAGE_CENTS = 3500;

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: pp } = await admin
    .from("patient_profiles")
    .select("connections_used, connections_limit")
    .eq("id", user.id)
    .maybeSingle();

  const { data: conns, error: ce } = await admin
    .from("connections")
    .select(
      "id, case_id, specialist_id, preferred_mode, status, match_score, created_at",
    )
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false });

  if (ce) {
    console.error("[patient/connections GET]", ce);
    return NextResponse.json({ error: "Could not load connections" }, { status: 500 });
  }

  const list = conns ?? [];
  const specIds = Array.from(new Set(list.map((c) => c.specialist_id)));

  let nameBy = new Map<string, string>();
  let specBy = new Map<string, Record<string, unknown>>();

  if (specIds.length > 0) {
    const { data: names } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", specIds);
    const { data: specs } = await admin
      .from("specialist_profiles")
      .select("id, title, specialty, institution")
      .in("id", specIds);
    nameBy = new Map((names ?? []).map((p) => [p.id, p.full_name as string]));
    specBy = new Map((specs ?? []).map((s) => [s.id, s as Record<string, unknown>]));
  }

  const connections = list.map((c) => {
    const sp = specBy.get(c.specialist_id);
    return {
      id: c.id,
      case_id: c.case_id,
      specialist_id: c.specialist_id,
      specialist_name: nameBy.get(c.specialist_id) ?? "Specialist",
      specialist_title: (sp?.title as string | null | undefined) ?? null,
      specialty: (sp?.specialty as string | null | undefined) ?? null,
      institution: (sp?.institution as string | null | undefined) ?? null,
      preferred_mode: c.preferred_mode,
      status: c.status,
      match_score: c.match_score,
      created_at: c.created_at,
    };
  });

  return NextResponse.json({
    usage: {
      used: pp?.connections_used ?? 0,
      limit: Math.max(1, pp?.connections_limit ?? 1),
    },
    connections,
  });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "patient") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const { case_id, specialist_id, preferred_mode, message, payment_intent_id } =
    parsed.data;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: caseRow, error: caseErr } = await admin
    .from("patient_cases")
    .select(
      "id, patient_id, specialty, condition_summary, urgency, age_group, status",
    )
    .eq("id", case_id)
    .eq("patient_id", user.id)
    .maybeSingle();

  if (caseErr || !caseRow) {
    return NextResponse.json(
      { error: "Case not found or not yours." },
      { status: 403 },
    );
  }

  const { data: allModes, error: modeListErr } = await admin
    .from("specialist_care_modes")
    .select("mode, available")
    .eq("specialist_id", specialist_id);

  if (modeListErr) {
    console.error("[patient/connections POST] care modes", modeListErr);
    return NextResponse.json({ error: "Could not verify care modes." }, { status: 500 });
  }

  const modeRows = allModes ?? [];
  if (modeRows.length > 0) {
    const modeRow = modeRows.find((m) => m.mode === preferred_mode);
    const okMode =
      modeRow &&
      (modeRow.available === "yes" || modeRow.available === "conditional");
    if (!okMode) {
      return NextResponse.json(
        { error: "Selected care mode is not available for this specialist." },
        { status: 400 },
      );
    }
  }

  const { data: mr } = await admin
    .from("match_results")
    .select("match_score")
    .eq("case_id", case_id)
    .eq("specialist_id", specialist_id)
    .maybeSingle();

  const { data: pp } = await admin
    .from("patient_profiles")
    .select("connections_used, connections_limit")
    .eq("id", user.id)
    .maybeSingle();

  const used = pp?.connections_used ?? 0;
  const limit = Math.max(1, pp?.connections_limit ?? 1);
  const atLimit = used >= limit;

  let isOverage = false;
  let overageCharge: number | null = null;
  let overagePaymentIntentId: string | null = null;

  if (atLimit) {
    if (!payment_intent_id?.trim()) {
      return NextResponse.json(
        {
          error:
            "You have used all connections included in your plan this month. Pay $35 to send another request.",
          code: "CONNECTION_LIMIT",
        },
        { status: 402 },
      );
    }

    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { error: "Stripe is not configured for overage payments." },
        { status: 500 },
      );
    }

    const pi = await stripe.paymentIntents.retrieve(payment_intent_id.trim());
    if (pi.status !== "succeeded") {
      return NextResponse.json(
        { error: "Payment has not completed successfully." },
        { status: 402 },
      );
    }
    if (pi.amount !== OVERAGE_CENTS || (pi.currency ?? "usd") !== "usd") {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }
    if (pi.metadata?.patient_id !== user.id) {
      return NextResponse.json({ error: "Payment does not match your account." }, { status: 400 });
    }
    if (pi.metadata?.purpose !== "connection_overage") {
      return NextResponse.json({ error: "Invalid payment purpose." }, { status: 400 });
    }

    const { data: existingPi } = await admin
      .from("connections")
      .select("id")
      .eq("overage_payment_intent_id", pi.id)
      .maybeSingle();

    if (existingPi) {
      return NextResponse.json(
        { error: "This payment was already used for a connection." },
        { status: 400 },
      );
    }

    isOverage = true;
    overageCharge = 35;
    overagePaymentIntentId = pi.id;
  }

  const { data: inserted, error: insErr } = await admin
    .from("connections")
    .insert({
      case_id,
      patient_id: user.id,
      specialist_id,
      match_score: mr?.match_score ?? null,
      preferred_mode,
      message,
      status: "pending",
      is_overage: isOverage,
      overage_charge: overageCharge,
      overage_payment_intent_id: overagePaymentIntentId,
    })
    .select("id, created_at, status, preferred_mode, match_score")
    .maybeSingle();

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        {
          error:
            "You already have a pending or accepted connection with this specialist for this case.",
        },
        { status: 409 },
      );
    }
    console.error("[patient/connections POST] insert", insErr);
    return NextResponse.json({ error: "Could not create connection" }, { status: 500 });
  }

  const { error: upErr } = await admin
    .from("patient_profiles")
    .update({ connections_used: used + 1 })
    .eq("id", user.id);

  if (upErr) {
    console.error("[patient/connections POST] increment usage", upErr);
    await admin.from("connections").delete().eq("id", inserted!.id);
    return NextResponse.json(
      { error: "Could not update connection usage." },
      { status: 500 },
    );
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const { data: specProfile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", specialist_id)
    .maybeSingle();

  const { data: specMeta } = await admin
    .from("specialist_profiles")
    .select("specialty")
    .eq("id", specialist_id)
    .maybeSingle();

  if (specProfile?.email) {
    try {
      await sendNewConnectionToSpecialist({
        to: specProfile.email,
        specialistName: specProfile.full_name ?? "Doctor",
        specialty: specMeta?.specialty ?? caseRow.specialty,
        urgency: caseRow.urgency,
        preferredMode: preferred_mode,
        inboxUrl: `${appBase}/specialist/connections`,
      });
    } catch (e) {
      console.error("[patient/connections POST] email", e);
    }
  }

  return NextResponse.json({ connection: inserted });
}
