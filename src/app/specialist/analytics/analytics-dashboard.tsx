"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PIE_COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#64748b"];

type AnalyticsPayload = {
  matchesPerMonth: { month: string; label: string; count: number }[];
  caseTypeBreakdown: { specialty: string; count: number }[];
  conversion: {
    matchedDistinctCases: number;
    connectedDistinctCasesOverlapping: number;
    conversionPercent: number | null;
  };
  avgMatchScore: number | null;
};

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
            Distinct matched cases: {data?.conversion.matchedDistinctCases ?? 0}. Overlap with connection
            cases: {data?.conversion.connectedDistinctCasesOverlapping ?? 0}.
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.matchesPerMonth ?? []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" name="Matches" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case type breakdown</CardTitle>
          <CardDescription>Patient case specialties you matched with most often</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          {pieData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No match data in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
