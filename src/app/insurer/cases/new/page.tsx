"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AGE_GROUP_OPTIONS,
  CASE_SPECIALTIES,
  INVESTIGATION_OPTIONS,
  URGENCY_OPTIONS,
} from "@/lib/cases/constants";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const schema = z.object({
  specialty: z.enum(["cardiology", "oncology", "orthopaedics"]),
  condition_summary: z.string().min(50).max(20000),
  age_group: z.enum(["infant", "child", "teen", "adult", "senior", "elder"]),
  urgency: z.enum(["routine", "within_4_weeks", "within_1_week"]),
  investigations: z.array(z.string()),
  treatments_tried: z.string().optional(),
  policyholder_ref: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function InsurerNewCasePage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      specialty: "cardiology",
      condition_summary: "",
      age_group: "adult",
      urgency: "routine",
      investigations: [],
      treatments_tried: "",
      policyholder_ref: "",
    },
  });

  const toggleInvestigation = (id: string, checked: boolean) => {
    const cur = form.getValues("investigations");
    if (id === "none" && checked) {
      form.setValue("investigations", ["none"]);
      return;
    }
    if (id !== "none" && checked) {
      form.setValue("investigations", [...cur.filter((x) => x !== "none"), id]);
      return;
    }
    form.setValue(
      "investigations",
      cur.filter((x) => x !== id),
    );
  };

  const onSubmit = async (values: FormValues) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/insurer/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          specialty: values.specialty,
          condition_summary: values.condition_summary,
          age_group: values.age_group,
          urgency: values.urgency,
          investigations_done: values.investigations,
          treatments_tried: values.treatments_tried?.trim() || null,
          policyholder_ref: values.policyholder_ref?.trim() || null,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string; match?: { ok?: boolean; error?: string } };
      if (!res.ok) {
        setErr(data.error ?? "Could not submit");
        setBusy(false);
        return;
      }
      if (data.id) {
        if (data.match && "ok" in data.match && data.match.ok === false) {
          setErr(`Case saved but matching failed: ${"error" in data.match ? data.match.error : "unknown"}`);
        }
        router.push(`/insurer/cases/${data.id}`);
        router.refresh();
        return;
      }
      setErr("Unexpected response");
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  };

  const summary = form.watch("condition_summary");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/insurer/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Submit insurer case</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We run the same matching engine as patient cases. Results are visible to your team only.
      </p>

      {err && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {err}
        </div>
      )}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Case details</CardTitle>
            <CardDescription>Required fields marked.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Specialty</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("specialty")}
              >
                {CASE_SPECIALTIES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="condition_summary">Condition summary (min 50 characters)</Label>
              <Textarea id="condition_summary" rows={6} {...form.register("condition_summary")} />
              <p className="text-xs text-muted-foreground">{summary.length} characters</p>
            </div>
            <div className="space-y-2">
              <Label>Patient age group</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("age_group")}
              >
                {AGE_GROUP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("urgency")}
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Investigations done</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3 sm:grid-cols-3">
                {INVESTIGATION_OPTIONS.map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.watch("investigations").includes(opt.id)}
                      onCheckedChange={(c) => toggleInvestigation(opt.id, Boolean(c))}
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tt">Treatments tried (optional)</Label>
              <Textarea id="tt" rows={3} {...form.register("treatments_tried")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ph">Your internal reference (not shared with specialists)</Label>
              <Input id="ph" {...form.register("policyholder_ref")} placeholder="Policy / claim ref" />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit and run matching"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </main>
  );
}
