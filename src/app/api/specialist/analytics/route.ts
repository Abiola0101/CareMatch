import { NextResponse } from "next/server";
import { subSpecialtyOverlapsCase } from "@/lib/match/subspec-keyword-overlap";
import { requireSpecialistUser } from "@/lib/specialist/api-auth";

export const dynamic = "force-dynamic";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthStarts(n: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(d);
  }
  return out;
}

export async function GET() {
  const ctx = await requireSpecialistUser();
  if ("error" in ctx) return ctx.error;
  const { supabase, userId } = ctx;

  const monthStarts = lastNMonthStarts(6);
  const fromIso = monthStarts[0]!.toISOString();

  const { data: matches, error: me } = await supabase
    .from("match_results")
    .select("case_id, match_score, computed_at")
    .eq("specialist_id", userId)
    .gte("computed_at", fromIso);

  if (me) {
    console.error("[specialist/analytics] match_results", me);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }

  const { data: connections, error: ce } = await supabase
    .from("connections")
    .select("case_id, status, created_at")
    .eq("specialist_id", userId)
    .gte("created_at", fromIso);

  if (ce) {
    console.error("[specialist/analytics] connections", ce);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }

  const caseIds = Array.from(
    new Set([
      ...(matches ?? []).map((m) => m.case_id),
      ...(connections ?? []).map((c) => c.case_id),
    ]),
  );

  const { data: specRow } = await supabase
    .from("specialist_profiles")
    .select("sub_specialties")
    .eq("id", userId)
    .maybeSingle();

  const rawTags = (specRow?.sub_specialties ?? []) as unknown[];
  const subSpecialtyTags = rawTags.filter(
    (t: unknown): t is string => typeof t === "string" && t.trim().length > 0,
  );

  let specialtyByCase = new Map<string, string | null>();
  let conditionByCase = new Map<string, string | null>();
  if (caseIds.length > 0) {
    const { data: cases } = await supabase
      .from("patient_cases")
      .select("id, specialty, condition_summary")
      .in("id", caseIds);
    for (const c of cases ?? []) {
      specialtyByCase.set(c.id, c.specialty);
      conditionByCase.set(c.id, c.condition_summary);
    }
  }

  const matchesPerMonth: { month: string; label: string; count: number }[] = monthStarts.map(
    (start) => {
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      const count = (matches ?? []).filter(
        (m) =>
          new Date(m.computed_at) >= start && new Date(m.computed_at) < end,
      ).length;
      return {
        month: monthKey(start),
        label: start.toLocaleString(undefined, { month: "short", year: "numeric" }),
        count,
      };
    },
  );

  const distinctMatchedCaseIds = Array.from(
    new Set((matches ?? []).map((m) => m.case_id)),
  );

  const tagCounts: Record<string, number> = {};
  if (subSpecialtyTags.length > 0 && distinctMatchedCaseIds.length > 0) {
    for (const caseId of distinctMatchedCaseIds) {
      const summary = conditionByCase.get(caseId) ?? null;
      for (const tag of subSpecialtyTags) {
        if (subSpecialtyOverlapsCase(tag, summary)) {
          tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
        }
      }
    }
  }

  const hasSubSpecBreakdown = Object.values(tagCounts).some((n) => n > 0);

  const specialtyFallback: Record<string, number> = {};
  for (const caseId of distinctMatchedCaseIds) {
    const spec = specialtyByCase.get(caseId) ?? "unknown";
    specialtyFallback[spec] = (specialtyFallback[spec] ?? 0) + 1;
  }

  const caseTypeBreakdown = Object.entries(hasSubSpecBreakdown ? tagCounts : specialtyFallback).map(
    ([specialty, count]) => ({
      specialty,
      count,
    }),
  );

  const caseTypeBreakdownSource = hasSubSpecBreakdown
    ? ("sub_specialties" as const)
    : ("specialty" as const);

  const matchedCaseIds = new Set((matches ?? []).map((m) => m.case_id));
  const connectedCaseIds = new Set(
    (connections ?? []).filter((c) => c.status === "accepted" || c.status === "pending").map((c) => c.case_id),
  );
  let overlap = 0;
  Array.from(connectedCaseIds).forEach((cid) => {
    if (matchedCaseIds.has(cid)) overlap++;
  });
  const conversionRate =
    matchedCaseIds.size > 0 ? Math.round((overlap / matchedCaseIds.size) * 1000) / 10 : null;

  const scores = (matches ?? [])
    .map((m) => m.match_score)
    .filter((s): s is number => s !== null && s !== undefined && !Number.isNaN(Number(s)));
  const avgMatchScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + Number(b), 0) / scores.length) * 100) / 100
      : null;

  return NextResponse.json({
    matchesPerMonth,
    caseTypeBreakdown,
    caseTypeBreakdownSource,
    conversion: {
      matchedDistinctCases: matchedCaseIds.size,
      connectedDistinctCasesOverlapping: overlap,
      conversionPercent: conversionRate,
    },
    avgMatchScore,
  });
}
