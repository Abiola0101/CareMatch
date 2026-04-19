"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ENQUIRY_TYPES = [
  { value: "insurer", label: "Insurer / enterprise access" },
  { value: "specialist", label: "Specialist listing" },
  { value: "patient", label: "Patient support" },
  { value: "partnership", label: "Partnership" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enquiryType, setEnquiryType] = useState("insurer");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    setSubmitting(true);
    // Simulate submission — wire to your email/CRM when ready
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        {/* Left — copy */}
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Get in touch
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Talk to the CareMatch team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Whether you&apos;re an insurer looking for enterprise access, a hospital
            group wanting to list your specialists, or a partner with an
            integration idea — we&apos;d love to hear from you.
          </p>

          <div className="mt-10 space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg">
                ✉
              </div>
              <div>
                <p className="font-medium">Email us directly</p>
                <a
                  href="mailto:hello@carematchglobal.com"
                  className="text-sm text-primary hover:underline"
                >
                  hello@carematchglobal.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg">
                🏢
              </div>
              <div>
                <p className="font-medium">Enterprise & insurer enquiries</p>
                <p className="text-sm text-muted-foreground">
                  Custom pricing, API access, and white-label options available
                  for health insurers and hospital groups.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-lg">
                ⏱
              </div>
              <div>
                <p className="font-medium">Response time</p>
                <p className="text-sm text-muted-foreground">
                  We respond to all enquiries within one business day.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div>
          {submitted ? (
            <Card className="border-green-500/30 bg-green-50 dark:bg-green-950/20">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <div className="mb-4 text-4xl">✓</div>
                <h2 className="text-xl font-semibold">Message received</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Thanks for reaching out. We&apos;ll get back to you within one
                  business day.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Send us a message</CardTitle>
                <CardDescription>
                  Tell us about your needs and we&apos;ll follow up.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dr. Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jane@organisation.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="enquiry">Enquiry type</Label>
                    <select
                      id="enquiry"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={enquiryType}
                      onChange={(e) => setEnquiryType(e.target.value)}
                    >
                      {ENQUIRY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your organisation and what you're looking for…"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? "Sending…" : "Send message"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
