import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.role !== "insurer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: row, error } = await supabase
    .from("insurer_profiles")
    .select(
      "company_name, cases_used_month, cases_limit_month, subscription_tier, billing_period_end, stripe_sub_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "Could not load usage" }, { status: 500 });
  }

  return NextResponse.json(row);
}
