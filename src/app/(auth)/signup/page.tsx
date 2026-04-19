"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SignupRole } from "@/lib/auth/role-profiles";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const roles: {
  value: SignupRole;
  label: string;
  description: string;
}[] = [
  {
    value: "patient",
    label: "Patient",
    description: "I need to find a specialist",
  },
  {
    value: "specialist",
    label: "Specialist",
    description: "I want to be discoverable to patients",
  },
  {
    value: "insurer",
    label: "Insurer",
    description: "I want to use the matching engine for policyholders",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<SignupRole>("patient");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setFormError("Full name is required.");
      return;
    }
    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }
    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    if (!termsAccepted) {
      setFormError("You must accept the terms of service.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          email: trimmedEmail,
          password,
          fullName: trimmedName,
          role,
          termsAccepted: true,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        ok?: boolean;
        needsEmailConfirm?: boolean;
      };

      if (!res.ok) {
        setFormError(payload.error ?? "Signup failed. Please try again.");
        return;
      }

      if (payload.needsEmailConfirm) {
        setInfoMessage(
          "Check your email and confirm your address. Then sign in — you will be taken to subscription onboarding."
        );
        return;
      }

      router.push("/onboarding/subscription");
      router.refresh();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-md">
      <div className="flex flex-col space-y-1.5 p-6">
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          Create an account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join CareMatch Global to access specialist matching.
        </p>
      </div>
      <form className="block" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="mx-6 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </div>
        )}
        {infoMessage && (
          <div className="mx-6 mt-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
            {infoMessage}{" "}
            <Link href="/signin" className="font-medium text-primary underline underline-offset-2">
              Sign in
            </Link>
          </div>
        )}

        <div className="space-y-4 p-6 pt-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium leading-none">
              Full name
            </label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(ev) => setFullName(ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium leading-none">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
            <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
          </div>

          <div
            className="space-y-2"
            role="radiogroup"
            aria-labelledby="role-heading"
          >
            <p id="role-heading" className="text-sm font-medium leading-none">
              Role
            </p>
            <div className="grid gap-2">
              {roles.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors hover:bg-accent",
                    role === r.value
                      ? "border-primary bg-accent"
                      : "border-border bg-background"
                  )}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="mt-0.5 h-4 w-4 shrink-0 border-primary text-primary accent-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{r.label}</span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {r.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <input
                id="terms"
                name="termsAccepted"
                type="checkbox"
                checked={termsAccepted}
                onChange={(ev) => setTermsAccepted(ev.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border border-primary accent-primary"
              />
              <label
                htmlFor="terms"
                className="cursor-pointer text-sm font-normal leading-snug text-foreground"
              >
                I agree to the terms of service (required)
              </label>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-6 pt-0">
          <button
            type="submit"
            className="inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create account"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/signin" className="text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
