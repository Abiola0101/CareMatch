import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { stripe } from "@/lib/stripe";
import { dashboardPathForRole } from "@/lib/auth/dashboard";

export const dynamic = "force-dynamic";

function tableForRole(
  role: "patient" | "specialist" | "hospital" | "insurer",
):
  | "patient_profiles"
  | "specialist_profiles"
  | "hospital_profiles"
  | "insurer_profiles" {
  switch (role) {
    case "patient":
      return "patient_profiles";
    case "specialist":
      return "specialist_profiles";
    case "hospital":
      return "hospital_profiles";
    case "insurer":
      return "insurer_profiles";
  }
}

export async function POST() {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY)." },
      { status: 500 },
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* ignore */
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role;
  if (
    role !== "patient" &&
    role !== "specialist" &&
    role !== "hospital" &&
    role !== "insurer"
  ) {
    return NextResponse.json(
      { error: "No billing profile for this account." },
      { status: 400 },
    );
  }

  const table = tableForRole(role);
  const { data: row } = await supabase
    .from(table)
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const customerId = row?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Subscribe first." },
      { status: 400 },
    );
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appBase}${dashboardPathForRole(role)}`,
  });

  return NextResponse.json({ url: portal.url });
}
