"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const roles = [
  {
    value: "patient",
    label: "Patient",
    description: "I need to find the best specialist for my condition",
  },
  {
    value: "specialist",
    label: "Specialist",
    description: "I want to be discoverable to patients globally",
  },
  {
    value: "insurer",
    label: "Insurer",
    description: "I manage specialist referrals for policyholders",
  },
] as const;

type RoleValue = (typeof roles)[number]["value"];

export default function OnboardingRolePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selected }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "Failed to set role. Please try again.");
        setSubmitting(false);
        return;
      }

      router.push("/onboarding/subscription");
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">How will you use CareMatch?</CardTitle>
          <CardDescription>
            Select your role to personalise your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-3">
            {roles.map((role) => {
              const isSelected = selected === role.value;
              return (
                <button
                  key={role.value}
                  type="button"
                  onClick={() => setSelected(role.value)}
                  className={[
                    "flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:border-primary/50 hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span className="font-semibold">{role.label}</span>
                  <span className="mt-0.5 text-sm text-muted-foreground">
                    {role.description}
                  </span>
                </button>
              );
            })}
          </div>

          <Button
            className="mt-2 w-full"
            size="lg"
            disabled={!selected || submitting}
            onClick={handleContinue}
          >
            {submitting ? "Saving…" : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
