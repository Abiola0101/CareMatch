import { NextResponse } from "next/server";
import { loadInsurerCaseDetailByShareToken } from "@/lib/insurer/case-detail";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } },
) {
  const detail = await loadInsurerCaseDetailByShareToken(params.token);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
