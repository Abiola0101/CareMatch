"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ProfileData = {
  company_name: string;
  full_name: string;
  phone: string;
};

export default function InsurerProfilePage() {
  const [form, setForm] = useState<ProfileData>({
    company_name: "",
    full_name: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/insurer/profile", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const p = data.profile ?? {};
          setForm({
            company_name:
              p.company_name && p.company_name !== "Pending"
                ? p.company_name
                : "",
            full_name: p.full_name ?? "",
            phone: p.phone ?? "",
          });
        }
      } catch {
        // ignore load errors — user can still fill in the form
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company_name.trim()) {
      setMessage({ type: "error", text: "Company name is required." });
      return;
    }
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/insurer/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          company_name: form.company_name.trim(),
          full_name: form.full_name.trim() || null,
          phone: form.phone.trim() || null,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile saved successfully." });
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: "error", text: data?.error ?? "Failed to save. Please try again." });
      }
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6">
        <Link
          href="/insurer/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Dashboard
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Organisation profile</CardTitle>
          <CardDescription>
            Add your company details to complete your insurer account setup.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                {message && (
                  <p
                    className={
                      message.type === "success"
                        ? "text-sm text-green-600"
                        : "text-sm text-destructive"
                    }
                  >
                    {message.text}
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="company_name">Company name *</Label>
                  <Input
                    id="company_name"
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Acme Insurance Ltd"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Contact full name</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    placeholder="Jane Smith"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 555 000 0000"
                  />
                </div>
              </>
            )}
          </CardContent>

          {!loading && (
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save"}
              </Button>
            </CardFooter>
          )}
        </form>
      </Card>
    </div>
  );
}
