import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";

export default async function InsurerCasesPage({
  searchParams,
}: {
  searchParams: { specialty?: string; status?: string; from?: string; to?: string };
}) {
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
  if (profile?.role !== "insurer") redirect(dashboardPathForRole(profile?.role));

  const access = await hasActivePlatformAccess(supabase, user.id);
  if (!access) redirect("/onboarding/subscription");

  let q = supabase
    .from("insurer_cases")
    .select("id, policyholder_ref, specialty, urgency, status, created_at")
    .eq("insurer_id", user.id)
    .order("created_at", { ascending: false });

  const { specialty, status, from, to } = searchParams;
  if (specialty && ["cardiology", "oncology", "orthopaedics"].includes(specialty)) {
    q = q.eq("specialty", specialty);
  }
  if (status && ["submitted", "matched", "closed"].includes(status)) {
    q = q.eq("status", status);
  }
  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to);

  const { data: rows } = await q;

  const qs = new URLSearchParams();
  if (specialty) qs.set("specialty", specialty);
  if (status) qs.set("status", status);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const qstr = qs.toString();

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
          <p className="text-sm text-muted-foreground">Filter and open any submission.</p>
        </div>
        <Button asChild>
          <Link href="/insurer/cases/new">Submit new case</Link>
        </Button>
      </div>

      <form className="grid gap-3 rounded-lg border p-4 sm:grid-cols-4" method="get">
        <div className="space-y-1">
          <Label>Specialty</Label>
          <select
            name="specialty"
            defaultValue={specialty ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="cardiology">Cardiology</option>
            <option value="oncology">Oncology</option>
            <option value="orthopaedics">Orthopaedics</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="submitted">Submitted</option>
            <option value="matched">Matched</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="from">From</Label>
          <Input id="from" name="from" type="date" defaultValue={from ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">To</Label>
          <Input id="to" name="to" type="date" defaultValue={to ?? ""} />
        </div>
        <div className="sm:col-span-4">
          <Button type="submit" variant="secondary" size="sm">
            Apply filters
          </Button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 font-medium">Reference</th>
              <th className="p-3 font-medium">Specialty</th>
              <th className="p-3 font-medium">Urgency</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  No cases match these filters.
                </td>
              </tr>
            ) : (
              (rows ?? []).map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="p-3">
                    <Link href={`/insurer/cases/${r.id}`} className="text-primary hover:underline">
                      {r.policyholder_ref || r.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3 capitalize">{r.specialty}</td>
                  <td className="p-3 text-muted-foreground">{r.urgency?.replace(/_/g, " ")}</td>
                  <td className="p-3 capitalize">{r.status}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
