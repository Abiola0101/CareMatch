"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Row = {
  id: string;
  status: string;
  preferred_mode: string | null;
  message: string | null;
  match_score: number | null;
  created_at: string;
  condition_summary: string;
  age_group: string | null;
  urgency: string | null;
  specialty: string | null;
};

function urgencyBadge(u: string | null) {
  switch (u) {
    case "within_1_week":
      return (
        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-800 dark:text-red-200">
          Urgent
        </span>
      );
    case "within_4_weeks":
      return (
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
          4 weeks
        </span>
      );
    default:
      return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          Routine
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

export default function SpecialistConnectionsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/specialist/connections", { credentials: "include" });
      const data = (await res.json()) as { connections?: Row[]; error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Could not load inbox.");
        setRows([]);
        return;
      }
      setRows(data.connections ?? []);
    } catch {
      setErr("Network error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (id: string, action: "accept" | "decline") => {
    setActing(id);
    setErr(null);
    try {
      const res = await fetch(`/api/specialist/connections/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErr(data.error ?? "Update failed.");
        setActing(null);
        return;
      }
      await load();
      router.refresh();
    } catch {
      setErr("Network error.");
    } finally {
      setActing(null);
    }
  };

  const pending = rows.filter((r) => r.status === "pending");
  const accepted = rows.filter((r) => r.status === "accepted");
  const archived = rows.filter((r) => r.status === "declined" || r.status === "expired");

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return days < 7 ? `${days}d ago` : new Date(iso).toLocaleDateString();
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <Link href="/specialist/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Connections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Patient identity is hidden until you accept a request.
        </p>
      </div>

      {err && <p className="mb-4 text-sm text-destructive">{err}</p>}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card px-6 py-12 text-center shadow-sm">
          <p className="text-4xl">📬</p>
          <h2 className="mt-4 font-semibold">Inbox is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When patients send connection requests, they will appear here. Keep your profile complete and verified to receive matches.
          </p>
        </div>
      ) : (
        <div className="space-y-8">

          {/* Pending requests */}
          {pending.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                New requests
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {pending.length}
                </span>
              </h2>
              <div className="space-y-4">
                {pending.map((r) => (
                  <Card key={r.id} className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="flex flex-row items-start justify-between pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.specialty && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                            {r.specialty}
                          </span>
                        )}
                        {urgencyBadge(r.urgency)}
                        <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </div>
                      {r.match_score != null && (
                        <div className="text-right">
                          <p className="text-xl font-bold text-primary">{Math.round(Number(r.match_score))}</p>
                          <p className="text-[10px] text-muted-foreground">match</p>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium">Requested care mode</p>
                        <p className="text-muted-foreground">{modeLabel(r.preferred_mode)}</p>
                      </div>
                      <p className="text-muted-foreground italic">
                        Accept to view the patient&apos;s clinical summary and message.
                      </p>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" disabled={acting === r.id} onClick={() => void act(r.id, "accept")}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" disabled={acting === r.id} onClick={() => void act(r.id, "decline")}>
                          Decline
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Active conversations */}
          {accepted.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active conversations
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
                {accepted.map((r, i) => (
                  <Link
                    key={r.id}
                    href={`/specialist/connections/${r.id}/messages`}
                    className={`flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 ${i !== 0 ? "border-t" : ""}`}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      P
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold truncate">
                          {r.specialty ? r.specialty.charAt(0).toUpperCase() + r.specialty.slice(1) : "Patient"}
                          {" "}case
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {modeLabel(r.preferred_mode)} · {urgencyBadge(r.urgency) ? r.urgency?.replace("_", " ") : "routine"}
                      </p>
                    </div>
                    <span className="text-muted-foreground">›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Archived */}
          {archived.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Archived
              </h2>
              <div className="overflow-hidden rounded-xl border bg-card opacity-60 shadow-sm">
                {archived.map((r, i) => (
                  <div key={r.id} className={`flex items-center gap-4 px-4 py-3 ${i !== 0 ? "border-t" : ""}`}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">P</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium capitalize">{r.status}</p>
                      <p className="text-xs text-muted-foreground">{modeLabel(r.preferred_mode)} · {timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
