import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { specialistProfileCompletionPercent } from "@/lib/specialist/profile-completion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

function formatTier(t: string | null | undefined): string {
  if (!t) return "—";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
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

export default async function SpecialistDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "specialist") {
    redirect(dashboardPathForRole(profile?.role));
  }

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) {
    redirect("/onboarding/subscription");
  }

  const { data: spec, error: se } = await supabase
    .from("specialist_profiles")
    .select(
      "verified, title, specialty, sub_specialties, institution, city, country, years_experience, languages, bio, avg_clinic_wait_days, avg_proc_wait_days, subscription_tier, billing_period_end",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (se || !spec) {
    notFound();
  }

  const completion = specialistProfileCompletionPercent(
    { full_name: profile?.full_name, phone: profile?.phone },
    spec as Parameters<typeof specialistProfileCompletionPercent>[1],
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: pendingCount }, { count: matchesMonth }, { count: requestsMonth }] =
    await Promise.all([
      supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("match_results")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", user.id)
        .gte("computed_at", monthStart),
      supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("specialist_id", user.id)
        .gte("created_at", monthStart),
    ]);

  const displayName = profile?.full_name?.trim().split(/\s+/)[0] ?? "there";

  return (
    <main className="mx-auto min-w-0 max-w-5xl space-y-8 px-3 py-6 sm:px-4 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome, {displayName}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your specialist workspace — profile, matches, and patient connections.
        </p>
      </div>

      {completion < 50 && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">Complete your profile to appear in search results</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Patients can only be matched to specialists with a complete profile. Add your specialty, availability, and care modes.
            </p>
          </div>
          <Button asChild className="shrink-0">
            <Link href="/specialist/profile">Complete profile →</Link>
          </Button>
        </div>
      )}

      {completion >= 50 && !spec.verified && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Your profile is not yet verified. Upload your credentials so our team can review and activate your listing.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Profile completion</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{completion}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Percentage of core profile fields filled in your specialist record.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending connections</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{pendingCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm">
              <Link href="/specialist/connections">View inbox</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This month</CardDescription>
            <CardTitle className="text-lg font-medium leading-snug">
              {matchesMonth ?? 0} matches · {requestsMonth ?? 0} connection requests
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Matches: algorithm runs including your profile. Requests: new patient connection rows created
            this calendar month.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>Active platform access</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Tier</p>
            <p className="text-lg font-semibold">{formatTier(spec.subscription_tier)}</p>
            <p className="mt-2 text-sm text-muted-foreground">Renewal / period end</p>
            <p className="text-lg font-semibold">{formatWhen(spec.billing_period_end)}</p>
          </div>
          <Button asChild>
            <Link href="/specialist/profile">Edit profile</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/specialist/analytics">Analytics</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/specialist/connections">Connections</Link>
        </Button>
      </div>
    </main>
  );
}
