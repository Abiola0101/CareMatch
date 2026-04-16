"use client";

import { useEffect, useState } from "react";
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

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/admin/users", { credentials: "include" });
      const j = (await res.json()) as { users?: UserRow[] };
      setRows(j.users ?? []);
      setLoading(false);
    })();
  }, []);

  const search = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
    const j = (await res.json()) as { users?: UserRow[] };
    setRows(j.users ?? []);
    setLoading(false);
  };

  const setSuspended = async (id: string, suspended: boolean) => {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suspended }),
    });
    void search();
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
            {rows.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="p-2">{u.full_name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2 capitalize">{u.role}</td>
                <td className="p-2">{u.subscription_tier ?? "—"}</td>
                <td className="p-2 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="p-2">
                  {u.suspended_at ? (
                    <Button size="sm" variant="outline" onClick={() => void setSuspended(u.id, false)}>
                      Reactivate
                    </Button>
                  ) : (
                    <Button size="sm" variant="destructive" onClick={() => void setSuspended(u.id, true)}>
                      Suspend
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
