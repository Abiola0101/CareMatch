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

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/specialist/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Connection inbox</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Newest requests first. Patient identity stays hidden until you accept.
      </p>

      {err ? (
        <p className="mt-4 text-sm text-destructive">{err}</p>
      ) : null}

      <div className="mt-8 space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inbox is empty</CardTitle>
              <CardDescription>
                When patients send connection requests, they will appear here. Complete your
                profile and stay verified to receive matches.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    {r.specialty ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-primary">
                        {r.specialty}
                      </span>
                    ) : null}
                    {urgencyBadge(r.urgency)}
                  </div>
                  <CardTitle className="mt-2 text-base">Connection request</CardTitle>
                  <CardDescription>
                    {modeLabel(r.preferred_mode)} ·{" "}
                    {new Date(r.created_at).toLocaleString()}
                  </CardDescription>
                </div>
                {r.match_score != null ? (
                  <div className="text-right text-sm">
                    <p className="text-2xl font-bold tabular-nums text-primary">
                      {Math.round(Number(r.match_score))}
                    </p>
                    <p className="text-xs text-muted-foreground">match score</p>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-foreground">Condition summary</p>
                  {r.status === "accepted" ? (
                    <>
                      <p className="mt-1 text-muted-foreground">
                        {r.condition_summary?.trim() ? r.condition_summary : "—"}
                      </p>
                      {r.age_group ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Age group: <span className="capitalize">{r.age_group}</span>
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      Accept this request to view the patient&apos;s clinical summary and age
                      group.
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">Patient message</p>
                  {r.status === "accepted" && r.message?.trim() ? (
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{r.message}</p>
                  ) : r.status === "accepted" ? (
                    <p className="mt-1 text-muted-foreground">—</p>
                  ) : (
                    <p className="mt-1 text-muted-foreground">
                      The patient&apos;s message is shown after you accept.
                    </p>
                  )}
                </div>
                {r.status === "pending" ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={acting === r.id}
                      onClick={() => void act(r.id, "accept")}
                    >
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={acting === r.id}
                      onClick={() => void act(r.id, "decline")}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled
                      title="Messaging opens after you accept"
                    >
                      Messages
                    </Button>
                  </div>
                ) : r.status === "accepted" ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/specialist/connections/${r.id}/messages`}>
                      Open messages
                    </Link>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground capitalize">
                    Status: {r.status}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
