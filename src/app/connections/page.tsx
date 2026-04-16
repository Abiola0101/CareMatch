import Link from "next/link";
import { redirect } from "next/navigation";
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

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          Pending
        </span>
      );
    case "accepted":
      return (
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:text-emerald-200">
          Accepted
        </span>
      );
    case "declined":
      return (
        <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">
          Declined
        </span>
      );
    case "expired":
      return (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          Expired
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
          {status}
        </span>
      );
  }
}

function modeLabel(m: string | null) {
  switch (m) {
    case "remote":
      return "Remote second opinion";
    case "telemedicine":
      return "Telemedicine";
    case "medical_travel":
      return "Medical travel";
    case "fly_doctor":
      return "Fly the doctor";
    default:
      return m ?? "—";
  }
}

export default async function PatientConnectionsPage() {
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

  if (profile?.role !== "patient") {
    redirect(dashboardPathForRole(profile?.role));
  }

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) redirect("/onboarding/subscription");

  const { data: rows } = await supabase
    .from("connections")
    .select(
      "id, specialist_id, preferred_mode, status, created_at, specialist_profiles(specialty)",
    )
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false });

  const list = rows ?? [];
  const specIds = Array.from(new Set(list.map((r) => r.specialist_id)));

  let nameBy = new Map<string, string>();
  if (specIds.length > 0) {
    const { data: names } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", specIds);
    nameBy = new Map((names ?? []).map((p) => [p.id, p.full_name as string]));
  }

  const connections = list.map((r) => {
    const raw = r.specialist_profiles as unknown;
    const sp = (Array.isArray(raw) ? raw[0] : raw) as {
      specialty: string | null;
    } | null;
    return {
      id: r.id,
      specialist_name: nameBy.get(r.specialist_id) ?? "Specialist",
      specialty: sp?.specialty ?? null,
      preferred_mode: r.preferred_mode,
      status: r.status,
      created_at: r.created_at,
    };
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Connections</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track requests you have sent to specialists.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Your connections</CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="space-y-2 py-2 text-center sm:text-left">
              <p className="text-sm font-medium text-foreground">No connections yet</p>
              <p className="text-sm text-muted-foreground">
                Open one of your cases, review match results, and send a connection request to a
                specialist. Accepted requests appear here with a link to messages.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{c.specialist_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {c.specialty
                        ? `${c.specialty.charAt(0).toUpperCase() + c.specialty.slice(1)} · `
                        : ""}
                      {modeLabel(c.preferred_mode)} ·{" "}
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                    <div className="mt-2">{statusBadge(c.status)}</div>
                  </div>
                  {c.status === "accepted" ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/connections/${c.id}/messages`}>View messages</Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
