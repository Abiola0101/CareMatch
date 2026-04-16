"use client";

import { useEffect, useState } from "react";
import type { PatientCaseDetail } from "@/lib/patient/case-detail";
import { CaseDetailClient } from "@/app/cases/[id]/case-detail-client";

export default function ShareInsurerCasePage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<PatientCaseDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/insurer-case/${encodeURIComponent(params.token)}`);
        if (!res.ok) {
          setErr("This link is invalid or has expired.");
          return;
        }
        const j = (await res.json()) as PatientCaseDetail;
        if (!cancelled) setData(j);
      } catch {
        if (!cancelled) setErr("Could not load results.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (err) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted-foreground">
        {err}
      </main>
    );
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <p className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted-foreground">
        Shared CareMatch match results (read-only). To connect with a specialist, create a
        patient account and subscription.
      </p>
      <CaseDetailClient
        initial={data}
        caseId={data.case.id}
        variant="insurer"
        backHref="/"
      />
    </div>
  );
}
