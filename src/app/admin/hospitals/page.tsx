"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  const load = useCallback(async () => {
    setLoading(true);
    const verified = tab === "verified" ? "true" : "false";
    const res = await fetch(`/api/admin/hospitals?verified=${verified}`, { credentials: "include" });
    const j = (await res.json()) as { hospitals?: Row[] };
    setRows(j.hospitals ?? []);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: string) => {
    await fetch(`/api/admin/hospitals/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    void load();
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Hospital verification</h1>
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
                  <Button size="sm" onClick={() => void approve(r.id)}>
                    Approve
                  </Button>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
