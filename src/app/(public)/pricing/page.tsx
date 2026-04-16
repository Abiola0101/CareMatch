"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          Transparent plans for patients and specialists. Clinical ranking is never
          pay-to-win.
        </p>
      </div>

      <div className="mt-10 mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
        <div className="space-y-1 text-center sm:text-left">
          <Label>Patient billing</Label>
          <p className="text-sm text-muted-foreground">
            Toggle monthly or annual for patient tiers.
          </p>
        </div>
        <div className="inline-flex justify-center rounded-lg border p-1">
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

      <h2 className="mb-4 text-lg font-semibold">Patients</h2>
      <div className="grid gap-6 md:grid-cols-2">
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
          <CardContent className="flex-1 text-sm text-muted-foreground">
            Core matching, email support, and standard response times.
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/signup">Get started</Link>
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
          <CardContent className="flex-1 text-sm text-muted-foreground">
            Priority matching, case summaries, and faster routing.
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <h2 className="mb-4 mt-14 text-lg font-semibold">Specialists</h2>
      <div className="grid gap-6 md:max-w-md">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Listed</CardTitle>
            <CardDescription>
              <span className="text-2xl font-semibold text-foreground">
                $290/mo
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                Billed monthly
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 text-sm text-muted-foreground">
            Searchable profile, basic discovery, and standard placement in the
            network.
          </CardContent>
          <CardFooter>
            <Button className="w-full" asChild>
              <Link href="/signup">Get started</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
