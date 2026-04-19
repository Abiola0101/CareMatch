import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const [profileResult, insurerResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("insurer_profiles")
      .select("company_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (profileResult.data?.role !== "insurer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    profile: {
      company_name: insurerResult.data?.company_name ?? null,
      full_name: profileResult.data?.full_name ?? null,
      phone: profileResult.data?.phone ?? null,
    },
  });
}

export async function PUT(request: Request) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "insurer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { company_name, full_name, phone } = body as {
    company_name?: string;
    full_name?: string;
    phone?: string;
  };

  const [insurerUpdate, profileUpdate] = await Promise.all([
    supabase
      .from("insurer_profiles")
      .update({ company_name: company_name ?? null })
      .eq("id", user.id),
    supabase
      .from("profiles")
      .update({
        full_name: full_name ?? null,
        phone: phone ?? null,
      })
      .eq("id", user.id),
  ]);

  if (insurerUpdate.error) {
    return NextResponse.json(
      { error: insurerUpdate.error.message },
      { status: 500 }
    );
  }

  if (profileUpdate.error) {
    return NextResponse.json(
      { error: profileUpdate.error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
