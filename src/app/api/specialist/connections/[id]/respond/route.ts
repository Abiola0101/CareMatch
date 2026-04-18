import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
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

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  // Verify the connection belongs to this specialist
  const { data: row, error: fetchErr } = await admin
    .from("connections")
    .select("id, specialist_first_responded_at")
    .eq("id", connectionId)
    .eq("specialist_id", user.id)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  // Only set if not already recorded (first response only)
  if (row.specialist_first_responded_at !== null) {
    return NextResponse.json({ already_recorded: true });
  }

  const { error: upErr } = await admin
    .from("connections")
    .update({ specialist_first_responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("specialist_id", user.id)
    .is("specialist_first_responded_at", null);

  if (upErr) {
    console.error("[specialist/connections/respond POST]", upErr);
    return NextResponse.json({ error: "Could not record response time" }, { status: 500 });
  }

  return NextResponse.json({ recorded: true });
}
