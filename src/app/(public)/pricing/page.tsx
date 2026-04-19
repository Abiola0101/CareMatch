"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Billing = "monthly" | "annual";

const plans = [
  {
    id: "patient",
    name: "Patient Plan",
    icon: "🧑‍⚕️",
    monthly: "$49",
    annual: "$470",
    monthlyRaw: 49,
    annualRaw: 470,
    tagline: "For individuals seeking the best clinical match globally.",
    features: [
      "Global specialist search across 3 specialties",
      "Clinical-fit ranking — transparent criteria",
      "4 care modes: remote opinion, telemedicine, travel, fly-the-doctor",
      "Case management dashboard",
      "Email support",
    ],
    cta: "Start as a patient",
    highlight: false,
  },
  {
    id: "specialist",
    name: "Specialist Plan",
    icon: "👨‍🔬",
    monthly: "$99",
    annual: "$950",
    monthlyRaw: 99,
    annualRaw: 950,
    tagline: "For clinicians who want to be found by patients who need them.",
    features: [
      "Verified specialist profile",
      "Appear in global search results",
      "Clinical-fit matched — based on your actual expertise",
      "Secure case messaging",
      "Profile analytics dashboard",
    ],
    cta: "Join as a specialist",
    highlight: false,
  },
  {
    id: "insurer",
    name: "Insurer Plan",
    icon: "🏢",
    monthly: "$199",
    annual: "$1,910",
    monthlyRaw: 199,
    annualRaw: 1910,
    tagline: "For insurers and care-coordination teams managing member cases.",
    features: [
      "Multi-member case management",
      "Bulk matching across covered lives",
      "Reporting and audit trail",
      "Dedicated account support",
      "Custom integration available",
    ],
    cta: "Contact us for access",
    highlight: false,
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          Three plans. No hidden fees. Ranking is based on clinical fit only —
          identical across all plans.
        </p>
      </div>

      {/* Billing toggle */}
      <div className="mt-10 flex flex-col items-center gap-3">
        <div className="inline-flex rounded-lg border bg-muted p-1">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              billing === "monthly"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${
              billing === "annual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual
            <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
              Save ~20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative flex flex-col ${
              plan.highlight
                ? "border-primary shadow-md ring-1 ring-primary"
                : ""
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground">
                  Most popular
                </span>
              </div>
            )}
            <CardHeader className="pb-4">
              <div className="mb-2 text-2xl">{plan.icon}</div>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.tagline}
              </p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">
                  {billing === "monthly" ? plan.monthly : plan.annual}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">
                  {billing === "monthly" ? "/mo" : "/yr"}
                </span>
                {billing === "annual" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Billed annually — equivalent to{" "}
                    <span className="font-medium text-foreground">
                      ${Math.round(plan.annualRaw / 12)}/mo
                    </span>
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pt-4">
              <Button
                className="w-full"
                variant={plan.highlight ? "default" : "outline"}
                asChild
              >
                <Link href={plan.id === "insurer" ? "/contact" : "/signup"}>
                  {plan.cta}
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Matching quality callout */}
      <div className="mt-10 rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/50">
        <div className="flex items-start gap-3">
          <span className="text-xl">⚖️</span>
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Matching quality is identical across all plans
            </p>
            <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
              Every subscriber — Patient, Specialist, or Insurer — receives the
              same clinical-fit ranking algorithm. Specialists cannot pay for
              better placement. Patients with higher-tier plans are not shown
              more results — they are shown the same honest match list as
              everyone else.
            </p>
          </div>
        </div>
      </div>

      {/* Overage note */}
      <div className="mt-6 rounded-xl border bg-muted/50 p-6">
        <div className="flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="font-semibold">Patient connection overage</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Each Patient Plan includes a monthly connection allowance.
              Additional specialist connections beyond the included allowance
              are billed at{" "}
              <span className="font-semibold text-foreground">
                $35 per connection
              </span>
              . You will be notified before any overage is charged.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
