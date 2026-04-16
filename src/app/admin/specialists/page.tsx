"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  specialty: string | null;
  institution: string | null;
  verified: boolean;
  created_at: string;
};

type Detail = {
  profile: { full_name: string; email: string | null } | null;
  specialist: Record<string, unknown> | null;
  documents: { id: string; doc_type: string; url: string; original_filename: string | null }[];
};

export default function AdminSpecialistsPage() {
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const verified = tab === "verified" ? "true" : "false";
    const res = await fetch(`/api/admin/specialists?verified=${verified}`, { credentials: "include" });
    const j = (await res.json()) as { specialists?: Row[]; error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Could not load");
      setRows([]);
    } else {
      setRows(j.specialists ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = async (id: string) => {
    setDrawerId(id);
    setDetail(null);
    const res = await fetch(`/api/admin/specialists/${id}`, { credentials: "include" });
    const j = (await res.json()) as Detail & { error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Could not load detail");
      return;
    }
    setDetail(j);
  };

  const approve = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/admin/specialists/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg((j as { error?: string }).error ?? "Failed");
      return;
    }
    setDrawerId(null);
    void load();
  };

  const reject = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/admin/specialists/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason: rejectReason }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg((j as { error?: string }).error ?? "Failed");
      return;
    }
    setRejectOpen(false);
    setRejectReason("");
    setDrawerId(null);
    void load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Specialist verification</h1>
      {msg ? <p className="text-sm text-destructive">{msg}</p> : null}

      <div className="flex gap-2 border-b pb-2">
        <Button variant={tab === "pending" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("pending")}>
          Pending
        </Button>
        <Button variant={tab === "verified" ? "secondary" : "ghost"} size="sm" onClick={() => setTab("verified")}>
          Verified
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nothing in this queue</CardTitle>
            <CardDescription>
              {tab === "pending"
                ? "No specialists are waiting for verification right now."
                : "No verified specialists are listed for this tab."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <CardTitle className="text-base">{r.full_name ?? r.id}</CardTitle>
                  <CardDescription>
                    {r.specialty} · {r.institution ?? "—"} · {new Date(r.created_at).toLocaleDateString()}
                  </CardDescription>
                </div>
                {tab === "pending" ? (
                  <Button size="sm" variant="outline" onClick={() => void openReview(r.id)}>
                    Review
                  </Button>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {drawerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <button
            type="button"
            className="flex-1 cursor-default bg-transparent"
            aria-label="Close"
            onClick={() => setDrawerId(null)}
          />
          <div className="h-full w-full max-w-lg overflow-y-auto border-l bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Review specialist</h2>
            {!detail ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <div className="mt-4 space-y-4 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {detail.profile?.full_name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {detail.profile?.email}
                </p>
                <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(detail.specialist, null, 2)}
                </pre>
                <div>
                  <p className="font-medium">Documents</p>
                  <ul className="mt-2 space-y-1">
                    {detail.documents.map((d) => (
                      <li key={d.id}>
                        <a href={d.url} className="text-primary underline" target="_blank" rel="noreferrer">
                          {d.doc_type} — {d.original_filename ?? "file"}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                {tab === "pending" ? (
                  <div className="flex gap-2 pt-4">
                    <Button disabled={busy} onClick={() => void approve(drawerId)}>
                      Approve
                    </Button>
                    <Button variant="destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
                      Reject
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {rejectOpen && drawerId ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Rejection reason</h3>
            <p className="mt-1 text-xs text-muted-foreground">Emailed to the specialist.</p>
            <div className="mt-4 space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" disabled={busy} onClick={() => void reject(drawerId)}>
                Send rejection
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
