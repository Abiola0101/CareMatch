"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Row = {
  id: string;
  institution_name: string;
  city: string;
  country: string;
  verified: boolean;
  full_name: string | null;
  email: string | null;
};

export default function AdminHospitalsPage() {
  const [tab, setTab] = useState<"pending" | "verified">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    const verified = tab === "verified" ? "true" : "false";
    const res = await fetch(`/api/admin/hospitals?verified=${verified}`, { credentials: "include" });
    const j = (await res.json()) as { hospitals?: Row[]; error?: string };
    if (!res.ok) {
      setMsg(j.error ?? "Could not load");
      setRows([]);
    } else {
      setRows(j.hospitals ?? []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/admin/hospitals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg((j as { error?: string }).error ?? "Approve failed");
      return;
    }
    void load();
  };

  const reject = async (id: string) => {
    setBusy(true);
    const res = await fetch(`/api/admin/hospitals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reason: rejectReason }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setMsg((j as { error?: string }).error ?? "Reject failed");
      return;
    }
    setRejectId(null);
    setRejectReason("");
    void load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Hospital verification</h1>
      {msg ? (
        <p className="text-sm text-destructive" role="alert">
          {msg}
        </p>
      ) : null}
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
                ? "There are no hospital profiles waiting for approval."
                : "No verified hospitals match this tab yet."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <CardTitle className="text-base">{r.institution_name}</CardTitle>
                  <CardDescription>
                    {r.city}, {r.country} · {r.full_name ?? r.email}
                  </CardDescription>
                </div>
                {tab === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={busy} onClick={() => void approve(r.id)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setRejectId(r.id);
                        setRejectReason("");
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {rejectId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-base">Reject hospital listing</CardTitle>
              <CardDescription>
                The hospital contact will receive this reason by email (min. 5 characters).
              </CardDescription>
            </CardHeader>
            <div className="space-y-3 px-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Reason</Label>
                <Textarea
                  id="reject-reason"
                  rows={5}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain what to fix or upload before they resubmit."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setRejectId(null);
                    setRejectReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busy || rejectReason.trim().length < 5}
                  onClick={() => void reject(rejectId)}
                >
                  Send rejection
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </main>
  );
}
