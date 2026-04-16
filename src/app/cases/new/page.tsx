"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  CASE_SPECIALTIES,
  DIAGNOSIS_OPTIONS,
  DURATION_OPTIONS,
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
  condition_summary: z
    .string()
    .min(50, "Please write at least 50 characters so we can match you properly."),
  duration: z.enum(["lt_1m", "m1_6", "m6_12", "y1_2", "gt_2"]),
  urgency: z.enum(["routine", "within_4_weeks", "within_1_week"]),
  diagnosis_status: z.enum(["confirmed", "suspected", "unknown"]),
  treatments_tried: z.string().optional(),
  additional_notes: z.string().optional(),
  investigations: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

export default function NewCasePage() {
  const router = useRouter();
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specError, setSpecError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      condition_summary: "",
      duration: "m1_6",
      urgency: "routine",
      diagnosis_status: "suspected",
      treatments_tried: "",
      additional_notes: "",
      investigations: [],
    },
  });

  const watchSummary = form.watch("condition_summary");

  const toggleSpecialty = (id: string) => {
    setSpecialties((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
    setSpecError(null);
  };

  const toggleInvestigation = (id: string, checked: boolean) => {
    const cur = form.getValues("investigations");
    if (id === "none" && checked) {
      form.setValue("investigations", ["none"]);
      return;
    }
    if (id !== "none" && checked) {
      form.setValue(
        "investigations",
        [...cur.filter((x) => x !== "none"), id],
      );
      return;
    }
    form.setValue(
      "investigations",
      cur.filter((x) => x !== id),
    );
  };

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    if (specialties.length === 0) {
      setSpecError("Select at least one specialty.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setFormError("Not signed in.");
      setBusy(false);
      return;
    }

    try {
      const apiUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/patient/cases`
          : "/api/patient/cases";

      const res = await fetch(apiUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          specialties: specialties as ("cardiology" | "oncology" | "orthopaedics")[],
        }),
      });

      const data = (await res.json()) as {
        case_ids?: string[];
        error?: string;
        match_warnings?: string[];
      };

      if (!res.ok) {
        setFormError(data.error ?? "Could not create case.");
        setBusy(false);
        return;
      }

      const caseIds = data.case_ids;
      if (!caseIds?.length) {
        setFormError("Could not create case.");
        setBusy(false);
        return;
      }

      const warnings = data.match_warnings?.filter(Boolean);
      if (warnings?.length) {
        setFormError(
          `${warnings.join(" ")} You can open your case and run matching again if needed.`,
        );
      }

      setBusy(false);
      router.push(`/cases/${caseIds[0]}`);
      router.refresh();
    } catch {
      setFormError("Request failed. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-w-0 max-w-3xl px-3 py-8 sm:px-4 sm:py-10">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">New case</h1>
      <p className="mt-2 text-muted-foreground">
        Tell us about your clinical situation. You can select more than one
        specialty if your condition crosses areas.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-8">
        <section>
          <h2 className="text-lg font-semibold">Specialties</h2>
          <p className="text-sm text-muted-foreground">
            Select all that apply.
          </p>
          <div
            role="group"
            aria-label="Specialties"
            className="relative isolate mt-4 grid gap-4 sm:grid-cols-3"
          >
            {CASE_SPECIALTIES.map((s) => {
              const active = specialties.includes(s.id);
              return (
                <label
                  key={s.id}
                  className={cn(
                    "relative isolate block min-h-[5.5rem] cursor-pointer touch-manipulation overflow-hidden rounded-xl border-2 p-6 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-muted-foreground/30",
                  )}
                >
                  {/* Full-card hit target — avoids WebKit/touch issues with plain buttons */}
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() => toggleSpecialty(s.id)}
                    className="absolute inset-0 z-20 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
                    aria-label={`Select ${s.label}`}
                  />
                  <span className="relative z-10 block pointer-events-none text-base font-semibold select-none">
                    {s.label}
                  </span>
                </label>
              );
            })}
          </div>
          {specError && (
            <p className="mt-2 text-sm text-destructive">{specError}</p>
          )}
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Clinical details</CardTitle>
            <CardDescription>
              Describe your condition summary (minimum 50 characters).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="condition_summary">Describe your condition</Label>
              <Textarea
                id="condition_summary"
                rows={6}
                placeholder="Include your diagnosis or suspected diagnosis, main symptoms, and what concerns you most."
                {...form.register("condition_summary")}
              />
              <p className="text-xs text-muted-foreground">
                {watchSummary.length} / 50+ characters
              </p>
              {form.formState.errors.condition_summary && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.condition_summary.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>How long has this been going on?</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...form.register("duration")}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <div className="space-y-2">
                {URGENCY_OPTIONS.map((u) => (
                  <label
                    key={u.value}
                    className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      value={u.value}
                      {...form.register("urgency")}
                      className="mt-1"
                    />
                    <span>{u.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Investigations done</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {INVESTIGATION_OPTIONS.map((inv) => {
                  const checked = form
                    .watch("investigations")
                    .includes(inv.id);
                  return (
                    <label
                      key={inv.id}
                      className="flex cursor-pointer items-center gap-2 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(c) =>
                          toggleInvestigation(inv.id, c === true)
                        }
                      />
                      {inv.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="treatments_tried">
                Treatments tried (optional)
              </Label>
              <Textarea
                id="treatments_tried"
                rows={3}
                {...form.register("treatments_tried")}
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnosis status</Label>
              <div className="space-y-2">
                {DIAGNOSIS_OPTIONS.map((d) => (
                  <label
                    key={d.value}
                    className="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm"
                  >
                    <input
                      type="radio"
                      value={d.value}
                      {...form.register("diagnosis_status")}
                      className="mt-1"
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_notes">Additional notes (optional)</Label>
              <Textarea
                id="additional_notes"
                rows={3}
                {...form.register("additional_notes")}
              />
            </div>
          </CardContent>
        </Card>

        {formError && (
          <p className="text-sm text-destructive">{formError}</p>
        )}

        <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Finding your matches…" : "Submit case"}
        </Button>
      </form>
    </div>
  );
}
