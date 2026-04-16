"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ensureRoleSpecificProfile } from "@/lib/auth/role-profiles";
import {
  type StripePricesPayload,
  patientPriceId,
  patientPricesAreConfigured,
  specialistPricesAreConfigured,
  specialistListedPriceId,
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
import { cn } from "@/lib/utils";

type Billing = "monthly" | "annual";

export default function SubscriptionOnboardingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [stripePrices, setStripePrices] = useState<StripePricesPayload | null>(
    null,
  );
  const [pricesLoading, setPricesLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrices() {
      setPricesLoading(true);
      try {
        const res = await fetch("/api/stripe/prices", { credentials: "same-origin" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as StripePricesPayload;
        if (!cancelled) {
          setStripePrices(data);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) {
          setPricesLoading(false);
        }
      }
    }

    loadPrices();
    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Choose your subscription
        </h1>
        <p className="text-muted-foreground">
          {role === "specialist"
            ? "Specialist plans unlock your profile on the platform. Select Listed to continue."
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

      {(role === "patient" || role === "specialist") && pricesLoading && (
        <p className="mb-6 text-sm text-muted-foreground">
          Loading checkout configuration…
        </p>
      )}

      {!pricesLoading &&
        role === "patient" &&
        !patientPricesOk &&
        stripePrices && (
          <p className="mb-6 text-sm text-amber-800 dark:text-amber-200">
            Configure patient Stripe price IDs in environment variables (see .env.example) to
            enable checkout.
          </p>
        )}

      {!pricesLoading &&
        role === "specialist" &&
        !specialistPricesOk &&
        stripePrices && (
          <p className="mb-6 text-sm text-amber-800 dark:text-amber-200">
            Configure <code className="rounded bg-muted px-1">STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY</code>{" "}
            (or the public equivalent) to enable Listed checkout.
          </p>
        )}

      {role === "admin" && (
        <p className="text-sm text-muted-foreground">
          Admin accounts do not require a subscription.
        </p>
      )}

      {role === "patient" && stripePrices && (
        <>
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

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Essential</CardTitle>
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
                  <li>Core matching</li>
                  <li>Email support</li>
                  <li>Standard response times</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={!patientPricesOk || checkoutLoading !== null}
                  onClick={() =>
                    startCheckout({
                      priceId: patientPriceId(
                        stripePrices,
                        "essential",
                        billing,
                      ),
                      label: "essential",
                      billingPeriod: billing,
                    })
                  }
                >
                  {checkoutLoading === "essential"
                    ? "Redirecting…"
                    : "Select Essential"}
                </Button>
              </CardFooter>
            </Card>

            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Standard</CardTitle>
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
                  <li>Priority matching</li>
                  <li>Case summaries</li>
                  <li>Faster routing</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={!patientPricesOk || checkoutLoading !== null}
                  onClick={() =>
                    startCheckout({
                      priceId: patientPriceId(
                        stripePrices,
                        "standard",
                        billing,
                      ),
                      label: "standard",
                      billingPeriod: billing,
                    })
                  }
                >
                  {checkoutLoading === "standard"
                    ? "Redirecting…"
                    : "Select Standard"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </>
      )}

      {role === "specialist" && stripePrices && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Listed</CardTitle>
              <CardDescription>
                <span className="text-2xl font-semibold text-foreground">
                  $290/month
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Billed monthly
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm font-medium">What&apos;s included</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Searchable profile</li>
                <li>Basic discovery</li>
                <li>Standard placement</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                disabled={!specialistPricesOk || checkoutLoading !== null}
                onClick={() =>
                  startCheckout({
                    priceId: specialistListedPriceId(stripePrices),
                    label: "listed",
                  })
                }
              >
                {checkoutLoading === "listed" ? "Redirecting…" : "Select Listed"}
              </Button>
            </CardFooter>
          </Card>

          <Card
            className={cn(
              "flex flex-col border-dashed opacity-70",
              "bg-muted/30 text-muted-foreground",
            )}
            aria-disabled
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-muted-foreground">Featured</CardTitle>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Coming soon
                </span>
              </div>
              <CardDescription>
                <span className="text-2xl font-semibold text-muted-foreground">
                  $690/month
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Billed monthly
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Planned highlights</p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Enhanced visibility in match results</li>
                <li>Priority placement</li>
                <li>Coming when checkout is enabled</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full" variant="secondary" disabled>
                Coming soon
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {(role === "hospital" || role === "insurer") && (
        <p className="text-sm text-muted-foreground">
          Self-serve checkout for {role} accounts is not wired yet. Contact
          CareMatch Global sales to enable billing for your organization.
        </p>
      )}
    </div>
  );
}
