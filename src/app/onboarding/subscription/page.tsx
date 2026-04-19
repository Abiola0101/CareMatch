"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureRoleSpecificProfile } from "@/lib/auth/role-profiles";
import {
  type StripePricesPayload,
  patientPriceId,
  specialistPriceId,
  insurerPriceId,
  patientPricesAreConfigured,
  specialistPricesAreConfigured,
  insurerPricesAreConfigured,
} from "@/lib/stripe/client-checkout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type Billing = "monthly" | "annual";

export default function SubscriptionOnboardingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read price IDs directly from NEXT_PUBLIC_ env vars (embedded at build time — always reliable)
  const stripePrices: StripePricesPayload = {
    patient: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PATIENT_MONTHLY ?? "",
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ANNUAL ?? "",
    },
    specialist: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_MONTHLY ?? "",
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_ANNUAL ?? "",
    },
    insurer: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_INSURER_MONTHLY ?? "",
      annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_INSURER_ANNUAL ?? "",
    },
    patientOverage: process.env.NEXT_PUBLIC_STRIPE_PRICE_PATIENT_OVERAGE ?? "",
  };

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (profile?.role) {
        setRole(profile.role);
        await ensureRoleSpecificProfile(supabase, user.id, profile.role);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const patientPricesOk = patientPricesAreConfigured(stripePrices);
  const specialistPricesOk = specialistPricesAreConfigured(stripePrices);
  const insurerPricesOk = insurerPricesAreConfigured(stripePrices);

  const startCheckout = async (opts: {
    priceId: string;
    label: string;
    billingPeriod?: Billing;
  }) => {
    setError(null);
    if (!userId || !role) {
      setError("Not signed in.");
      return;
    }
    if (!opts.priceId) {
      setError(
        "Stripe price IDs are missing. Set STRIPE_PRICE_* variables on the server (see .env.example).",
      );
      return;
    }

    setCheckoutLoading(opts.label);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          priceId: opts.priceId,
          userId,
          userRole: role,
          billingPeriod: opts.billingPeriod,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Checkout failed.");
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No checkout URL returned.");
    } catch {
      setError("Network error starting checkout.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  const showToggle = role === "patient" || role === "specialist" || role === "insurer";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your subscription
        </h1>
        <p className="text-muted-foreground">
          {role === "specialist"
            ? "Specialist plans unlock your profile on the platform. Select a plan to continue."
            : role === "insurer"
            ? "Insurer plans provide access to the CareMatch platform for your organisation."
            : "CareMatch Global does not offer a free tier. Select a plan to continue."}
        </p>
      </div>

      {!role && (
        <p className="text-sm text-muted-foreground">Loading your account…</p>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}


      {role === "admin" && (
        <p className="text-sm text-muted-foreground">
          Admin accounts do not require a subscription.
        </p>
      )}

      {showToggle && stripePrices && (
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label>Billing</Label>
            <p className="text-sm text-muted-foreground">
              Annual plans are billed once per year at the rates below.
            </p>
          </div>
          <div className="inline-flex rounded-lg border p-1">
            <Button
              type="button"
              variant={billing === "monthly" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBilling("monthly")}
            >
              Monthly
            </Button>
            <Button
              type="button"
              variant={billing === "annual" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setBilling("annual")}
            >
              Annual
            </Button>
          </div>
        </div>
      )}

      {role === "patient" && stripePrices && (
        <div className="grid gap-4 md:grid-cols-1 max-w-sm">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Patient Plan</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  {billing === "monthly" ? "$49/mo" : "$470/yr"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {billing === "monthly"
                    ? "Billed monthly"
                    : "Billed annually ($470/year)"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm font-medium">What&apos;s included</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Precision matching to top specialists globally</li>
                <li>Direct enquiry to matched specialists</li>
                <li>Case submission and tracking</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                disabled={!patientPricesOk || checkoutLoading !== null}
                onClick={() =>
                  startCheckout({
                    priceId: patientPriceId(stripePrices, billing),
                    label: "patient",
                    billingPeriod: billing,
                  })
                }
              >
                {checkoutLoading === "patient" ? "Redirecting…" : "Select Patient Plan"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {role === "specialist" && stripePrices && (
        <div className="grid gap-4 md:grid-cols-1 max-w-sm">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Specialist Plan</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  {billing === "monthly" ? "$99/mo" : "$950/yr"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {billing === "monthly"
                    ? "Billed monthly"
                    : "Billed annually ($950/year)"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm font-medium">What&apos;s included</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Searchable specialist profile</li>
                <li>Precision matching to patients</li>
                <li>Priority placement in results</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                disabled={!specialistPricesOk || checkoutLoading !== null}
                onClick={() =>
                  startCheckout({
                    priceId: specialistPriceId(stripePrices, billing),
                    label: "specialist",
                    billingPeriod: billing,
                  })
                }
              >
                {checkoutLoading === "specialist" ? "Redirecting…" : "Select Specialist Plan"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {role === "insurer" && stripePrices && (
        <div className="grid gap-4 md:grid-cols-1 max-w-sm">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Insurer Plan</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  {billing === "monthly" ? "$199/mo" : "$1,910/yr"}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {billing === "monthly"
                    ? "Billed monthly"
                    : "Billed annually ($1,910/year)"}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm font-medium">What&apos;s included</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Precision matching for your members</li>
                <li>Organisation-level dashboard</li>
                <li>Dedicated support</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                disabled={!insurerPricesOk || checkoutLoading !== null}
                onClick={() =>
                  startCheckout({
                    priceId: insurerPriceId(stripePrices, billing),
                    label: "insurer",
                    billingPeriod: billing,
                  })
                }
              >
                {checkoutLoading === "insurer" ? "Redirecting…" : "Select Insurer Plan"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
