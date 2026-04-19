import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { modeLabel, timeAgo } from "@/lib/connections/labels";

export default async function PatientConnectionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "patient") redirect(dashboardPathForRole(profile?.role));

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) redirect("/onboarding/subscription");

  const { data: rows } = await supabase
    .from("connections")
    .select("id, specialist_id, preferred_mode, status, created_at, message, specialist_profiles(specialty)")
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
    const sp = (Array.isArray(raw) ? raw[0] : raw) as { specialty: string | null } | null;
    return {
      id: r.id,
      specialist_name: nameBy.get(r.specialist_id) ?? "Specialist",
      specialty: sp?.specialty ?? null,
      preferred_mode: r.preferred_mode,
      status: r.status,
      created_at: r.created_at,
      message: r.message,
    };
  });

  const accepted = connections.filter((c) => c.status === "accepted");
  const pending = connections.filter((c) => c.status === "pending");
  const archived = connections.filter((c) => c.status === "declined" || c.status === "expired");

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Your specialist connections and conversations.
          </p>
        </div>
      </div>

      {accepted.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active conversations
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {accepted.map((c, i) => (
              <Link
                key={c.id}
                href={`/connections/${c.id}/messages`}
                className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${
                  i !== 0 ? "border-t" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {c.specialist_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{c.specialist_name}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.specialty ? `${c.specialty.charAt(0).toUpperCase() + c.specialty.slice(1)} · ` : ""}
                    {modeLabel(c.preferred_mode)}
                  </p>
                </div>
                <span className="text-muted-foreground">›</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Awaiting specialist response
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            {pending.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-4 px-4 py-4 ${i !== 0 ? "border-t" : ""}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  {c.specialist_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground truncate">{c.specialist_name}</p>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Pending
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.specialty ? `${c.specialty.charAt(0).toUpperCase() + c.specialty.slice(1)} · ` : ""}
                    {modeLabel(c.preferred_mode)} · {timeAgo(c.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Specialists are expected to respond within 48 hours.
          </p>
        </div>
      )}

      {archived.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Archived
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card opacity-60 shadow-sm">
            {archived.map((c, i) => (
              <div
                key={c.id}
                className={`flex items-center gap-4 px-4 py-4 ${i !== 0 ? "border-t" : ""}`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {c.specialist_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{c.specialist_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{c.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {connections.length === 0 && (
        <div className="rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-4xl">💬</p>
          <h2 className="mt-4 font-semibold">No messages yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When you send a connection request to a specialist and they accept, your conversation will appear here.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
          >
            Go to my cases →
          </Link>
        </div>
      )}
    </main>
  );
}
