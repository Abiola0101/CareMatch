import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadInsurerCaseDetail } from "@/lib/insurer/case-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
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

  const detail = await loadInsurerCaseDetail(params.id);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
