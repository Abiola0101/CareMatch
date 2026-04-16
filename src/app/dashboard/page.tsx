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

  const { data: pp, error: ppe } = await supabase
    .from("patient_profiles")
    .select(
      "connections_used, connections_limit, subscription_tier, billing_period_end",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (ppe || !pp) {
    notFound();
  }

  const used = pp.connections_used ?? 0;
  const limit = Math.max(1, pp.connections_limit ?? 1);
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const atLimit = used >= limit;

  const { data: cases } = await supabase
    .from("patient_cases")
    .select("id, title, specialty, created_at, status")
    .eq("patient_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const display = firstName(profile?.full_name);

  return (
    <div className="mx-auto min-w-0 max-w-5xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Welcome, {display}
        </h1>
        <p className="text-muted-foreground">
          Your CareMatch Global patient home.
        </p>
      </div>

      {atLimit && (
        <div className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          You have used all your connections this month. Additional connections
          cost <strong>$35</strong> each.
        </div>
      )}

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connections this month</CardTitle>
            <CardDescription>
              {used} of {limit} connections used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Subscription</CardTitle>
            <CardDescription>
              <span className="inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs font-medium">
                {formatTier(pp.subscription_tier)} tier
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Renewal / period end:{" "}
              <span className="font-medium text-foreground">
                {formatWhen(pp.billing_period_end)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold">Active cases</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/connections">Connections</Link>
          </Button>
          <Button asChild>
            <Link href="/cases/new">Create new case</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your open cases</CardTitle>
          <CardDescription>
            Cases with status &quot;active&quot; — follow up on matches anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!cases?.length ? (
            <p className="text-sm text-muted-foreground">
              No active cases yet. Create your first case to get matched.
            </p>
          ) : (
            <ul className="divide-y">
              {cases.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">
                      {c.title ?? `${c.specialty ?? "Case"}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {c.specialty
                        ? `${c.specialty.charAt(0).toUpperCase() + c.specialty.slice(1)} · `
                        : ""}
                      Created{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/cases/${c.id}`}>View matches</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
