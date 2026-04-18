import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  sendConnectionAcceptedToPatient,
  sendConnectionDeclinedToPatient,
} from "@/lib/emails/connection-emails";

export const dynamic = "force-dynamic";

const putSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

function firstName(full: string | null | undefined): string {
  if (!full?.trim()) return "there";
  return full.trim().split(/\s+/)[0] ?? "there";
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const connectionId = params.id;
  if (!connectionId || !z.string().uuid().safeParse(connectionId).success) {
    return NextResponse.json({ error: "Invalid connection id" }, { status: 400 });
  }

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

  if (profile?.role !== "specialist") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { action } = parsed.data;

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const { data: row, error: fe } = await admin
    .from("connections")
    .select("id, status, patient_id, specialist_id, specialist_first_responded_at")
    .eq("id", connectionId)
    .eq("specialist_id", user.id)
    .maybeSingle();

  if (fe || !row) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  if (row.status !== "pending") {
    return NextResponse.json(
      { error: "This connection is no longer pending." },
      { status: 400 },
    );
  }

  const nextStatus = action === "accept" ? "accepted" : "declined";

  // Record first response time only if not already set
  const responseTimestamp = row.specialist_first_responded_at === null
    ? new Date().toISOString()
    : undefined;

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  if (responseTimestamp !== undefined) {
    updatePayload.specialist_first_responded_at = responseTimestamp;
  }

  const { error: upErr } = await admin
    .from("connections")
    .update(updatePayload)
    .eq("id", connectionId)
    .eq("specialist_id", user.id);

  if (upErr) {
    console.error("[specialist/connections PUT]", upErr);
    return NextResponse.json({ error: "Could not update connection" }, { status: 500 });
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

  const { data: patientProf } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", row.patient_id)
    .maybeSingle();

  const { data: specProf } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: specMeta } = await admin
    .from("specialist_profiles")
    .select("specialty")
    .eq("id", user.id)
    .maybeSingle();

  if (patientProf?.email) {
    try {
      if (action === "accept") {
        await sendConnectionAcceptedToPatient({
          to: patientProf.email,
          patientFirstName: firstName(patientProf.full_name),
          specialistName: specProf?.full_name ?? "Your specialist",
          specialty: specMeta?.specialty ?? null,
          messagesUrl: `${appBase}/connections/${connectionId}/messages`,
        });
      } else {
        await sendConnectionDeclinedToPatient({
          to: patientProf.email,
          patientFirstName: firstName(patientProf.full_name),
          specialistName: specProf?.full_name ?? "The specialist",
        });
      }
    } catch (e) {
      console.error("[specialist/connections PUT] email", e);
    }
  }

  return NextResponse.json({ status: nextStatus });
}
