"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

type MeResponse = {
  role?: string;
  stripe_sub_id?: string | null;
};

function dashboardPathForRole(role: string | undefined): string {
  switch (role) {
    case "specialist":
      return "/specialist/dashboard";
    case "hospital":
      return "/hospital/dashboard";
    case "insurer":
      return "/insurer/dashboard";
    default:
      return "/dashboard";
  }
}

export default function OnboardingCompletePage() {
  const [status, setStatus] = useState<"polling" | "active" | "timeout">(
    "polling",
  );
  const [role, setRole] = useState<string | undefined>(undefined);

  const startedAt = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      const elapsed = Date.now() - startedAt.current;
      if (elapsed >= POLL_TIMEOUT_MS) {
        setStatus("timeout");
        return;
      }

      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data: MeResponse = await res.json();
          if (data.stripe_sub_id) {
            setRole(data.role);
            setStatus("active");
            return;
          }
        }
      } catch {
        // network hiccup — keep polling
      }

      if (!cancelled) {
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const dest =
    role === "patient" ? "/onboarding/profile" : dashboardPathForRole(role);

  const cta =
    role === "patient" ? "Continue to your profile" : "Go to my dashboard";

  if (status === "polling") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <svg
          className="mb-6 h-10 w-10 animate-spin text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <h1 className="text-2xl font-semibold tracking-tight">
          Activating your subscription...
        </h1>
        <p className="mt-3 text-muted-foreground">
          Please wait while we confirm your payment with Stripe.
        </p>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Taking longer than expected
        </h1>
        <p className="mt-3 text-muted-foreground">
          Taking longer than expected — please refresh in a moment.
        </p>
        <Button
          className="mt-8"
          size="lg"
          onClick={() => {
            startedAt.current = Date.now();
            setStatus("polling");
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  // status === "active"
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Your subscription is active
      </h1>
      <p className="mt-3 text-muted-foreground">
        Thank you. You can continue to your CareMatch Global dashboard.
      </p>
      <Button className="mt-8" asChild size="lg">
        <Link href={dest}>{cta}</Link>
      </Button>
    </div>
  );
}
