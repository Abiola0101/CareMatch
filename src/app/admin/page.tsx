import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { data: prof } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.role !== "admin") redirect("/");

  let admin: ReturnType<typeof createServiceRoleClient>;
  try {
    admin = createServiceRoleClient();
  } catch {
    redirect("/");
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    patientSubs,
    specialistSubs,
    hospitalSubs,
    insurerSubs,
    pendingSpec,
    pendingHosp,
    patientMatchesToday,
    insurerMatchesToday,
  ] = await Promise.all([
    admin.from("patient_profiles").select("id", { count: "exact", head: true }).not("stripe_sub_id", "is", null),
    admin.from("specialist_profiles").select("id", { count: "exact", head: true }).not("stripe_sub_id", "is", null),
    admin.from("hospital_profiles").select("id", { count: "exact", head: true }).not("stripe_sub_id", "is", null),
    admin.from("insurer_profiles").select("id", { count: "exact", head: true }).not("stripe_sub_id", "is", null),
    admin
      .from("specialist_profiles")
      .select("id", { count: "exact", head: true })
      .eq("verified", false),
    admin.from("hospital_profiles").select("id", { count: "exact", head: true }).eq("verified", false),
    admin.from("match_results").select("id", { count: "exact", head: true }).gte("computed_at", startOfDay.toISOString()),
    admin
      .from("insurer_match_results")
      .select("id", { count: "exact", head: true })
      .gte("computed_at", startOfDay.toISOString()),
  ]);

  const matchesTodayTotal =
    (patientMatchesToday.count ?? 0) + (insurerMatchesToday.count ?? 0);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Operations overview</p>
      </div>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link className="text-primary underline" href="/admin/specialists">
          Specialist verifications
        </Link>
        <Link className="text-primary underline" href="/admin/hospitals">
          Hospital verifications
        </Link>
        <Link className="text-primary underline" href="/admin/users">
          Users
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active subscribers</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(patientSubs.count ?? 0) +
                (specialistSubs.count ?? 0) +
                (hospitalSubs.count ?? 0) +
                (insurerSubs.count ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>Patients: {patientSubs.count ?? 0}</p>
            <p>Specialists: {specialistSubs.count ?? 0}</p>
            <p>Hospitals: {hospitalSubs.count ?? 0}</p>
            <p>Insurers: {insurerSubs.count ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending verifications</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {(pendingSpec.count ?? 0) + (pendingHosp.count ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs text-muted-foreground">
            <p>Specialists (unverified): {pendingSpec.count ?? 0}</p>
            <p>Hospitals (unverified): {pendingHosp.count ?? 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Matches run today</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{matchesTodayTotal}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            <p>
              Patient pipeline:{" "}
              <span className="font-medium text-foreground">{patientMatchesToday.count ?? 0}</span>{" "}
              (<code className="rounded bg-muted px-1">match_results</code>)
            </p>
            <p className="mt-1">
              Insurer pipeline:{" "}
              <span className="font-medium text-foreground">{insurerMatchesToday.count ?? 0}</span>{" "}
              (<code className="rounded bg-muted px-1">insurer_match_results</code>)
            </p>
            <p className="mt-2">Since server midnight UTC for the current day.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
