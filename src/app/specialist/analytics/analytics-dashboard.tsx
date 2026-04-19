"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BAR_COLORS = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-slate-500",
];

const PIE_HEX = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#64748b"];

type AnalyticsPayload = {
  matchesPerMonth: { month: string; label: string; count: number }[];
  caseTypeBreakdown: { specialty: string; count: number }[];
  caseTypeBreakdownSource?: "sub_specialties" | "specialty";
  conversion: {
    matchedDistinctCases: number;
    connectedDistinctCasesOverlapping: number;
    conversionPercent: number | null;
  };
  avgMatchScore: number | null;
};

/** Simple CSS bar chart — no external dependency. */
function BarChartCSS({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-full items-end gap-2">
      {data.map((d, i) => {
        const pct = Math.round((d.count / max) * 100);
        return (
          <div key={d.label} className="group flex flex-1 flex-col items-center gap-1">
            <span className="hidden text-[10px] text-muted-foreground group-hover:block">
              {d.count}
            </span>
            <div className="w-full rounded-t" style={{ height: `${Math.max(pct, 2)}%` }}>
              <div
                className={`h-full w-full rounded-t ${BAR_COLORS[i % BAR_COLORS.length]}`}
              />
            </div>
            <span className="truncate text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Simple CSS donut / legend chart — no external dependency. */
function PieChartCSS({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  // Build conic-gradient stops
  let cumulative = 0;
  const stops = data
    .map((d, i) => {
      const start = Math.round((cumulative / total) * 360);
      cumulative += d.value;
      const end = Math.round((cumulative / total) * 360);
      return `${PIE_HEX[i % PIE_HEX.length]} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <div
        className="h-40 w-40 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${stops})` }}
        aria-hidden="true"
      />
      <ul className="space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ background: PIE_HEX[i % PIE_HEX.length] }}
            />
            <span className="text-foreground">{d.name}</span>
            <span className="ml-auto pl-4 tabular-nums text-muted-foreground">
              {d.value} ({Math.round((d.value / (data.reduce((s, x) => s + x.value, 0) || 1)) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SpecialistAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/specialist/analytics");
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = "/signin";
            return;
          }
          if (res.status === 403) {
            setError("You do not have access to this page.");
            return;
          }
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Failed to load");
        }
        const j = (await res.json()) as AnalyticsPayload;
        if (!cancelled) setData(j);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-muted-foreground">
        Loading analytics…
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/specialist/dashboard">Back to dashboard</Link>
        </Button>
      </main>
    );
  }

  const pieData =
    data?.caseTypeBreakdown.map((d) => ({
      name: d.specialty === "unknown" ? "Unknown" : d.specialty,
      value: d.count,
    })) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Match activity and connection outcomes over the last six months.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Matches → connections</CardDescription>
            <CardTitle className="text-2xl">
              {data?.conversion.conversionPercent != null
                ? `${data.conversion.conversionPercent}%`
                : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Distinct matched cases: {data?.conversion.matchedDistinctCases ?? 0}. Overlap with
            connection cases: {data?.conversion.connectedDistinctCasesOverlapping ?? 0}.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average match score</CardDescription>
            <CardTitle className="text-2xl">
              {data?.avgMatchScore != null ? data.avgMatchScore.toFixed(2) : "—"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Mean of all match scores recorded for you in this window.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Match frequency</CardTitle>
          <CardDescription>Matches per month (last 6 months)</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          {(data?.matchesPerMonth ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No match data in this period.</p>
          ) : (
            <BarChartCSS data={data!.matchesPerMonth} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case type breakdown</CardTitle>
          <CardDescription>
            {data?.caseTypeBreakdownSource === "sub_specialties"
              ? "Your profile sub-specialties that overlap with matched case narratives (same keyword logic as clinical matching)."
              : "Patient case specialties among your distinct matched cases. Add sub-specialty tags on your profile for a tag-level breakdown when case text overlaps your tags."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No match data in this period.</p>
          ) : (
            <PieChartCSS data={pieData} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
