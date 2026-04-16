"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  suspended_at: string | null;
  subscription_tier: string | null;
};

type ProfileDetail = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  country: string | null;
  created_at: string;
  suspended_at: string | null;
  avatar_url: string | null;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [profileDetail, setProfileDetail] = useState<ProfileDetail | null>(null);
  const [roleProfile, setRoleProfile] = useState<Record<string, unknown> | null>(null);

  const search = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
    const j = (await res.json()) as { users?: UserRow[] };
    setRows(j.users ?? []);
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const j = (await res.json()) as { users?: UserRow[] };
      setRows(j.users ?? []);
      setLoading(false);
    })();
  }, []);

  const openProfile = async (id: string) => {
    setDrawerId(id);
    setProfileDetail(null);
    setRoleProfile(null);
    setDetailErr(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { credentials: "include" });
      const j = (await res.json()) as {
        profile?: ProfileDetail;
        roleProfile?: Record<string, unknown> | null;
        error?: string;
      };
      if (!res.ok) {
        setDetailErr(j.error ?? "Could not load");
        return;
      }
      setProfileDetail(j.profile ?? null);
      setRoleProfile(j.roleProfile ?? null);
    } catch {
      setDetailErr("Network error");
    } finally {
      setDetailLoading(false);
    }
  };

  const setSuspended = async (id: string, suspended: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended }),
    });
    void search();
    if (drawerId === id) {
      void openProfile(id);
    }
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Users</h1>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <div className="space-y-1">
          <Label htmlFor="q">Search email or name</Label>
          <Input id="q" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
        </div>
        <Button type="submit" disabled={loading}>
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Email</th>
              <th className="p-2">Role</th>
              <th className="p-2">Tier</th>
              <th className="p-2">Created</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  {loading ? "Loading…" : "No users match this search."}
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-2">{u.full_name}</td>
                  <td className="p-2">{u.email}</td>
                  <td className="p-2 capitalize">{u.role}</td>
                  <td className="p-2">{u.subscription_tier ?? "—"}</td>
                  <td className="p-2 text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void openProfile(u.id)}>
                        View profile
                      </Button>
                      {u.suspended_at ? (
                        <Button size="sm" variant="outline" onClick={() => void setSuspended(u.id, false)}>
                          Reactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="destructive" onClick={() => void setSuspended(u.id, true)}>
                          Suspend
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {drawerId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <button
            type="button"
            className="flex-1 cursor-default bg-transparent"
            aria-label="Close"
            onClick={() => setDrawerId(null)}
          />
          <div className="h-full w-full max-w-lg overflow-y-auto border-l bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold">User profile</h2>
            {detailLoading ? (
              <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
            ) : detailErr ? (
              <p className="mt-4 text-sm text-destructive">{detailErr}</p>
            ) : profileDetail ? (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <span className="font-medium">Name:</span> {profileDetail.full_name}
                </p>
                <p>
                  <span className="font-medium">Email:</span> {profileDetail.email}
                </p>
                <p>
                  <span className="font-medium">Role:</span> {profileDetail.role}
                </p>
                <p>
                  <span className="font-medium">Phone:</span> {profileDetail.phone ?? "—"}
                </p>
                <p>
                  <span className="font-medium">Country:</span> {profileDetail.country ?? "—"}
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {new Date(profileDetail.created_at).toLocaleString()}
                </p>
                <p>
                  <span className="font-medium">Suspended:</span>{" "}
                  {profileDetail.suspended_at
                    ? new Date(profileDetail.suspended_at).toLocaleString()
                    : "No"}
                </p>
                {roleProfile && Object.keys(roleProfile).length > 0 ? (
                  <div className="mt-4 border-t pt-4">
                    <p className="font-medium">Role profile (raw)</p>
                    <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(roleProfile, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">No extended role profile row.</p>
                )}
                <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                  {profileDetail.suspended_at ? (
                    <Button size="sm" variant="outline" onClick={() => void setSuspended(drawerId, false)}>
                      Reactivate account
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => void setSuspended(drawerId, true)}>
                      Suspend account
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
