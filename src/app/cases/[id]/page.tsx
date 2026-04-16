import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPatientCaseDetail } from "@/lib/patient/case-detail";
import { CaseDetailClient } from "./case-detail-client";

export const metadata: Metadata = {
  title: "Case · CareMatch",
};

export default async function CaseDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await loadPatientCaseDetail(params.id);
  if (!data) {
    notFound();
  }

  return (
    <CaseDetailClient
      initial={data}
      caseId={params.id}
    />
  );
}
