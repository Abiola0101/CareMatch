import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { hasActivePlatformAccess } from "@/lib/auth/subscription";
import { loadInsurerCaseDetail } from "@/lib/insurer/case-detail";
import type { PatientCaseDetail } from "@/lib/patient/case-detail";
import { CaseDetailClient } from "@/app/cases/[id]/case-detail-client";
import { InsurerCaseActions } from "./insurer-case-actions";

export const dynamic = "force-dynamic";

export default async function InsurerCaseDetailPage({
  params,
}: {
  params: { id: string };
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

  const detail = await loadInsurerCaseDetail(params.id);
  if (!detail) notFound();

  const initial = detail as unknown as PatientCaseDetail;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <Link href="/insurer/cases" className="text-sm text-muted-foreground hover:text-foreground">
        ← All cases
      </Link>
      <InsurerCaseActions caseId={params.id} shareToken={detail.case.share_token} />
      <CaseDetailClient
        initial={initial}
        caseId={params.id}
        variant="insurer"
        backHref="/insurer/cases"
      />
      <p className="mt-8 border-t pt-4 text-sm text-muted-foreground">
        To connect with a specialist, your policyholder needs to create their own CareMatch
        subscription.
      </p>
    </div>
  );
}
