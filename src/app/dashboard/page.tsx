import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function firstName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) {
    return "there";
  }
  return fullName.trim().split(/\s+/)[0] ?? "there";
}

function formatTier(t: string | null | undefined): string {
  if (!t) {
    return "—";
  }
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function progressBarColor(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-green-500";
}

function progressTextColor(pct: number): string {
  if (pct >= 100) return "text-red-600 dark:text-red-400";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

const specialtyLabel: Record<string, string> = {
  cardiology: "Cardiology",
  oncology: "Oncology",
  orthopaedics: "Orthopaedics & MSK",
};

const specialtyBadge: Record<string, string> = {
  cardiology:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  oncology:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  orthopaedics:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
};

export default async function PatientDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "patient") {
    redirect(dashboardPathForRole(profile?.role));
  }

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) {
    redirect("/onboarding/subscription");
  }

  const [{ data: pp, error: ppe }, { data: cases }] = await Promise.all([
    supabase.from("patient_profiles").select("connections_used, connections_limit, subscription_tier, billing_period_end").eq("id", user.id).maybeSingle(),
    supabase.from("patient_cases").select("id, title, specialty, created_at, status").eq("patient_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(20),
  ]);

  if (ppe || !pp) {
    notFound();
  }

  const used = pp.connections_used ?? 0;
  const limit = Math.max(1, pp.connections_limit ?? 1);
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;

  const display = firstName(profile?.full_name);

  return (
    <div className="mx-auto min-w-0 max-w-5xl px-3 py-6 sm:px-4 sm:py-10">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {display} 👋
        </h1>
        <p className="mt-1.5 text-muted-foreground">
          Your CareMatch Global patient dashboard — track your cases and
          specialist connections.
        </p>
      </div>

      {/* At-limit alert */}
      {atLimit && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
          <span className="mt-0.5 text-base">⚠️</span>
          <p>
            You have used all your connections this month. Additional
            connections cost <strong>$35</strong> each.
          </p>
        </div>
      )}

      {/* Stats row */}
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {/* Connections card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Connections this month</CardTitle>
            <CardDescription>
              <span className={`font-semibold ${progressTextColor(pct)}`}>
                {used} of {limit}
              </span>{" "}
              connections used ({pct}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${progressBarColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {atLimit
                ? "Limit reached — additional connections billed at $35/ea"
                : pct >= 70
                  ? "Approaching your monthly limit"
                  : `${limit - used} connections remaining`}
            </p>
          </CardContent>
        </Card>

        {/* Subscription card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Your current plan details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="inline-flex rounded-full border bg-muted px-2.5 py-0.5 text-xs font-semibold">
                {formatTier(pp.subscription_tier)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Period ends</span>
              <span className="font-medium">
                {formatWhen(pp.billing_period_end)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases section header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Active cases</h2>
          <p className="text-sm text-muted-foreground">
            Cases currently open for specialist matching.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/connections">View connections</Link>
          </Button>
          <Button size="sm" className="font-semibold shadow-sm" asChild>
            <Link href="/cases/new">+ Create new case</Link>
          </Button>
        </div>
      </div>

      {/* Cases table/list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Your open cases</CardTitle>
          <CardDescription>
            Cases with status &quot;active&quot; — follow up on matches anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {!cases?.length ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 text-4xl">🔍</div>
              <h3 className="font-semibold">No active cases yet</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Create your first case to start matching with globally ranked
                specialists by clinical fit.
              </p>
              <Button className="mt-6 font-semibold shadow-sm" asChild>
                <Link href="/cases/new">Create your first case</Link>
              </Button>
            </div>
          ) : (
            /* Table header + rows */
            <div>
              {/* Column headers — hidden on mobile */}
              <div className="hidden border-b px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto_auto]">
                <span>Case</span>
                <span className="mr-12">Specialty</span>
                <span className="mr-12">Created</span>
                <span />
              </div>
              <ul className="divide-y">
                {cases.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-muted/30 sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {c.title ?? c.specialty ?? "Untitled case"}
                      </p>
                    </div>
                    <div className="sm:mr-4">
                      {c.specialty ? (
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                            specialtyBadge[c.specialty.toLowerCase()] ??
                            "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {specialtyLabel[c.specialty.toLowerCase()] ??
                            c.specialty.charAt(0).toUpperCase() +
                              c.specialty.slice(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground sm:mr-4">
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/cases/${c.id}`}>View matches</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
