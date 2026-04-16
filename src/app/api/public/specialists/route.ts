import { NextResponse } from "next/server";
import { queryPublicSpecialists } from "@/lib/data/public-specialists";

export const dynamic = "force-dynamic";

const SPECIALTIES = new Set(["all", "cardiology", "oncology", "orthopaedics"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawSpec = url.searchParams.get("specialty")?.trim() ?? "all";
  const specialty = SPECIALTIES.has(rawSpec) ? rawSpec : null;
  if (!specialty) {
    return NextResponse.json(
      { error: "Invalid specialty. Use all, cardiology, oncology, or orthopaedics." },
      { status: 400 },
    );
  }

  const country = url.searchParams.get("country")?.trim() || undefined;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 12));

  try {
    const { items, total, page: p, limit: l } = await queryPublicSpecialists({
      specialty,
      country,
      page,
      limit,
    });

    return NextResponse.json({
      data: items,
      total,
      page: p,
      limit: l,
    });
  } catch (e) {
    console.error("[public/specialists]", e);
    return NextResponse.json(
      { error: "Could not load specialists." },
      { status: 500 },
    );
  }
}
