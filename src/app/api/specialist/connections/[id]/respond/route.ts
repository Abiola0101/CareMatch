// This route is no longer active.
// The logic for recording a specialist's first response time is handled
// by the PUT handler in ../route.ts (the parent connections/[id] route).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
