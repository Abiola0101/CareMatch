"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { ageGroupFromDateOfBirth, type PatientAgeGroup } from "@/lib/patient/age-group";
import { COUNTRY_OPTIONS } from "@/lib/data/countries";
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

const ageGroupOptions: { value: PatientAgeGroup; label: string }[] = [
  { value: "infant", label: "Infant" },
  { value: "child", label: "Child" },
  { value: "teen", label: "Teen" },
  { value: "adult", label: "Adult" },
  { value: "senior", label: "Senior" },
  { value: "elder", label: "Elder" },
];

const schema = z.object({
  date_of_birth: z.string().min(1, "Date of birth is required"),
  primary_country: z.string().min(1, "Select your primary country"),
  age_group: z.enum([
    "infant",
    "child",
    "teen",
    "adult",
    "senior",
    "elder",
  ]),
  biological_sex: z.string().optional(),
  emergency_name: z.string().optional(),
  emergency_phone: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PatientProfileOnboardingPage() {
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      date_of_birth: "",
      primary_country: "",
      age_group: "adult",
      biological_sex: "",
      emergency_name: "",
      emergency_phone: "",
    },
  });

  const dob = form.watch("date_of_birth");

  useEffect(() => {
    const g = ageGroupFromDateOfBirth(dob);
    if (g) {
      form.setValue("age_group", g);
    }
  }, [dob, form]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        return;
      }

      // Role guard: only patients should access this page
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled && profile?.role !== "patient") {
        router.replace(dashboardPathForRole(profile?.role));
        return;
      }

      const { data: row, error } = await supabase
        .from("patient_profiles")
        .select(
          "date_of_birth, primary_country, age_group, biological_sex, emergency_contact",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (error || cancelled) {
        return;
      }
      if (row?.date_of_birth) {
        form.setValue("date_of_birth", row.date_of_birth);
      }
      if (row?.primary_country && row.primary_country !== "Pending") {
        form.setValue("primary_country", row.primary_country);
      }
      if (row?.age_group) {
        form.setValue("age_group", row.age_group as PatientAgeGroup);
      }
      if (row?.biological_sex) {
        form.setValue("biological_sex", row.biological_sex);
      }
      const ec = row?.emergency_contact as
        | { name?: string; phone?: string }
        | null;
      if (ec?.name) {
        form.setValue("emergency_name", ec.name);
      }
      if (ec?.phone) {
        form.setValue("emergency_phone", ec.phone);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [form]);

  const onSubmit = async (values: FormValues) => {
    setLoadError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoadError("Not signed in.");
      return;
    }

    const emergency =
      values.emergency_name?.trim() || values.emergency_phone?.trim()
        ? {
            name: values.emergency_name?.trim() || undefined,
            phone: values.emergency_phone?.trim() || undefined,
          }
        : null;

    const { error } = await supabase
      .from("patient_profiles")
      .update({
        date_of_birth: values.date_of_birth,
        primary_country: values.primary_country,
        age_group: values.age_group,
        biological_sex: values.biological_sex?.trim() || null,
        emergency_contact: emergency,
      })
      .eq("id", user.id);

    if (error) {
      setLoadError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Your profile</CardTitle>
          <CardDescription>
            We use this to match you clinically. You can update it later in
            settings.
          </CardDescription>
        </CardHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {loadError && (
              <p className="text-sm text-destructive">{loadError}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Date of birth</Label>
              <Input
                id="date_of_birth"
                type="date"
                {...form.register("date_of_birth")}
              />
              {form.formState.errors.date_of_birth && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.date_of_birth.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primary_country">Primary country</Label>
              <select
                id="primary_country"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("primary_country")}
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.primary_country && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.primary_country.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="age_group">Age group</Label>
              <p className="text-xs text-muted-foreground">
                Suggested from your date of birth — you can adjust if needed.
              </p>
              <select
                id="age_group"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...form.register("age_group")}
              >
                {ageGroupOptions.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="biological_sex">Biological sex (optional)</Label>
              <Input
                id="biological_sex"
                placeholder="e.g. Female, Male, or leave blank"
                {...form.register("biological_sex")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_name">
                Emergency contact name (optional)
              </Label>
              <Input id="emergency_name" {...form.register("emergency_name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_phone">
                Emergency contact phone (optional)
              </Label>
              <Input
                id="emergency_phone"
                type="tel"
                {...form.register("emergency_phone")}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Saving…" : "Save and continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
