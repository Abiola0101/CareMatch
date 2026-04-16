import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import {
  getCheckoutSubscriptionMetadata,
  priceIdAllowedForRole,
} from "@/lib/stripe/pricing";
import { ensureRoleSpecificProfile } from "@/lib/auth/role-profiles";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  priceId: z.string().min(1),
  userId: z.string().uuid(),
  userRole: z.enum(["patient", "specialist", "hospital", "insurer", "admin"]),
  billingPeriod: z.enum(["monthly", "annual"]).optional(),
});

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

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY)." },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const { priceId, userId, userRole } = parsed.data;

  if (userRole === "admin") {
    return NextResponse.json(
      { error: "Admin accounts do not use checkout." },
      { status: 400 },
    );
  }

  if (!priceIdAllowedForRole(priceId, userRole)) {
    return NextResponse.json(
      { error: "Price is not valid for this account type." },
      { status: 400 },
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

  if (!user || user.id !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, email, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.role || profile.role !== userRole) {
    return NextResponse.json(
      { error: "Role does not match your profile." },
      { status: 403 },
    );
  }

  if (
    profile.role !== "patient" &&
    profile.role !== "specialist" &&
    profile.role !== "hospital" &&
    profile.role !== "insurer"
  ) {
    return NextResponse.json({ error: "Invalid role for checkout." }, { status: 400 });
  }

  const role = profile.role;

  await ensureRoleSpecificProfile(supabase, user.id, role);

  const table = tableForRole(role);

  const { data: roleRow } = await supabase
    .from(table)
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = roleRow?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name,
      metadata: {
        supabase_user_id: user.id,
        supabase_role: role,
      },
    });
    customerId = customer.id;

    const { error: saveErr } = await supabase
      .from(table)
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);

    if (saveErr) {
      return NextResponse.json(
        { error: "Could not save Stripe customer id." },
        { status: 500 },
      );
    }
  }

  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  const meta = getCheckoutSubscriptionMetadata({
    priceId,
    userId: user.id,
    role,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appBase}/onboarding/complete`,
    cancel_url: `${appBase}/onboarding/subscription`,
    client_reference_id: user.id,
    metadata: {
      ...meta,
      supabase_user_id: user.id,
      supabase_role: role,
    },
    subscription_data: {
      metadata: meta,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Checkout session did not return a URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: session.url });
}
