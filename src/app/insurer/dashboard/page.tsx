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

export const dynamic = "force-dynamic";

function monthStartIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
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

function formatTier(t: string | null | undefined): string {
  if (!t) return "—";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default async function InsurerDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "insurer") {
    redirect(dashboardPathForRole(profile?.role));
  }

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) redirect("/onboarding/subscription");

  const { data: ip, error } = await supabase
    .from("insurer_profiles")
    .select(
      "company_name, cases_used_month, cases_limit_month, subscription_tier, billing_period_end",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !ip) notFound();

  const start = monthStartIso();
  const { count: monthCount } = await supabase
    .from("insurer_cases")
    .select("id", { count: "exact", head: true })
    .eq("insurer_id", user.id)
    .gte("created_at", start);

  const { data: recent } = await supabase
    .from("insurer_cases")
    .select("id, specialty, urgency, status, policyholder_ref, created_at")
    .eq("insurer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const used = ip.cases_used_month ?? 0;
  const limit = Math.max(1, ip.cases_limit_month ?? 20);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{ip.company_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Insurer workspace</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cases submitted this month</CardTitle>
            <CardDescription>Against your plan allowance (billing period)</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">
              {used}{" "}
              <span className="text-lg font-normal text-muted-foreground">of {limit}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Submissions counted toward your monthly case quota (resets on your billing cycle).
              New cases created this calendar month: {monthCount ?? 0}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Tier and renewal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Tier: </span>
              <span className="font-medium">{formatTier(ip.subscription_tier)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Renewal: </span>
              <span className="font-medium">{formatWhen(ip.billing_period_end)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/insurer/cases/new">Submit new case</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/insurer/cases">All cases</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent cases</CardTitle>
          <CardDescription>Last five submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {(recent ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases yet.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {(recent ?? []).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                  <Link href={`/insurer/cases/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.policyholder_ref || c.id.slice(0, 8)} · {c.specialty}
                  </Link>
                  <span className="text-muted-foreground capitalize">{c.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
