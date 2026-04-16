import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dashboardPathForRole } from "@/lib/auth/dashboard";
import { Button } from "@/components/ui/button";

export default async function OnboardingCompletePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const dest =
    profile?.role === "patient"
      ? "/onboarding/profile"
      : dashboardPathForRole(profile?.role);

  const cta =
    profile?.role === "patient"
      ? "Continue to your profile"
      : "Go to my dashboard";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Your subscription is active
      </h1>
      <p className="mt-3 text-muted-foreground">
        Thank you. You can continue to your CareMatch Global dashboard.
      </p>
      <Button className="mt-8" asChild size="lg">
        <Link href={dest}>{cta}</Link>
      </Button>
    </div>
  );
}
