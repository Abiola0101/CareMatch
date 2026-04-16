"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InsurerCaseActions({
  caseId,
  shareToken,
}: {
  caseId: string;
  shareToken: string;
}) {
  const [msg, setMsg] = useState<string | null>(null);

  const copyShare = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/insurer/${encodeURIComponent(shareToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      setMsg(
        "Link copied. Send it to your policyholder — they need their own CareMatch subscription to connect with specialists.",
      );
    } catch {
      setMsg("Could not copy — copy manually: " + url);
    }
  };

  const exportPdf = () => {
    window.open(`/api/insurer/cases/${caseId}/pdf`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <Button type="button" variant="outline" onClick={exportPdf}>
        Export as PDF
      </Button>
      <Button type="button" variant="outline" onClick={() => void copyShare()}>
        Share results link
      </Button>
      {msg ? <p className="w-full text-sm text-muted-foreground">{msg}</p> : null}
    </div>
  );
}
