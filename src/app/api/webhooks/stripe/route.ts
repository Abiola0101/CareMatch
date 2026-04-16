import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { resend } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import {
  patientTierFromPriceId,
  specialistTierFromPriceId,
  type PatientTier,
} from "@/lib/stripe/pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfileLocation =
  | {
      role: "patient" | "specialist" | "hospital" | "insurer";
      userId: string;
      table:
        | "patient_profiles"
        | "specialist_profiles"
        | "hospital_profiles"
        | "insurer_profiles";
    }
  | null;

async function findProfileByStripeCustomerId(
  customerId: string,
): Promise<ProfileLocation> {
  const admin = createServiceRoleClient();

  const { data: p } = await admin
    .from("patient_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (p) {
    return { role: "patient", userId: p.id, table: "patient_profiles" };
  }

  const { data: s } = await admin
    .from("specialist_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (s) {
    return { role: "specialist", userId: s.id, table: "specialist_profiles" };
  }

  const { data: h } = await admin
    .from("hospital_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (h) {
    return { role: "hospital", userId: h.id, table: "hospital_profiles" };
  }

  const { data: i } = await admin
    .from("insurer_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (i) {
    return { role: "insurer", userId: i.id, table: "insurer_profiles" };
  }

  return null;
}

async function findProfileByStripeSubscriptionId(
  subscriptionId: string,
): Promise<ProfileLocation> {
  const admin = createServiceRoleClient();
  for (const table of [
    "patient_profiles",
    "specialist_profiles",
    "hospital_profiles",
    "insurer_profiles",
  ] as const) {
    const { data } = await admin
      .from(table)
      .select("id")
      .eq("stripe_sub_id", subscriptionId)
      .maybeSingle();
    if (data) {
      const role =
        table === "patient_profiles"
          ? "patient"
          : table === "specialist_profiles"
            ? "specialist"
            : table === "hospital_profiles"
              ? "hospital"
              : "insurer";
      return { role, userId: data.id, table };
    }
  }
  return null;
}

function getCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): string | null {
  if (!customer) {
    return null;
  }
  if (typeof customer === "string") {
    return customer;
  }
  if ("deleted" in customer && customer.deleted) {
    return null;
  }
  return customer.id;
}

function getPrimaryPriceId(sub: Stripe.Subscription): string | null {
  const item = sub.items.data[0];
  if (!item?.price) {
    return null;
  }
  const p = item.price;
  return typeof p === "string" ? p : p.id;
}

async function resolveTierMetadata(
  priceId: string | null,
  sub: Stripe.Subscription,
): Promise<{ metaTier: string | null }> {
  const fromSub = sub.metadata?.carematch_tier?.trim() ?? null;
  if (fromSub) {
    return { metaTier: fromSub };
  }
  if (!priceId) {
    return { metaTier: null };
  }
  const price = await stripe.prices.retrieve(priceId);
  return {
    metaTier:
      price.metadata?.carematch_tier?.trim() ??
      price.metadata?.tier?.trim() ??
      null,
  };
}

async function applySubscriptionUpsert(sub: Stripe.Subscription) {
  const customerId = getCustomerId(sub.customer);
  if (!customerId) {
    return;
  }

  const loc = await findProfileByStripeCustomerId(customerId);
  if (!loc) {
    return;
  }

  const priceId = getPrimaryPriceId(sub);
  const { metaTier } = await resolveTierMetadata(priceId, sub);
  const admin = createServiceRoleClient();

  const periodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000).toISOString()
    : null;

  if (loc.role === "patient") {
    const resolved =
      patientTierFromPriceId(priceId ?? "", metaTier) ??
      patientTierFromPriceId(priceId ?? "", sub.metadata?.carematch_tier);
    if (!resolved) {
      return;
    }
    const tier = resolved.tier as PatientTier;
    await admin
      .from("patient_profiles")
      .update({
        stripe_sub_id: sub.id,
        subscription_tier: tier,
        connections_limit: resolved.connectionsLimit,
        billing_period_end: periodEnd,
      })
      .eq("id", loc.userId);
    return;
  }

  if (loc.role === "specialist") {
    const tier =
      specialistTierFromPriceId(priceId ?? "", metaTier) ??
      specialistTierFromPriceId(
        priceId ?? "",
        sub.metadata?.carematch_tier,
      );
    if (!tier) {
      return;
    }
    await admin
      .from("specialist_profiles")
      .update({
        stripe_sub_id: sub.id,
        subscription_tier: tier,
        billing_period_end: periodEnd,
      })
      .eq("id", loc.userId);
    return;
  }

  if (loc.role === "hospital") {
    await admin
      .from(loc.table)
      .update({
        stripe_sub_id: sub.id,
      })
      .eq("id", loc.userId);
    return;
  }

  if (loc.role === "insurer") {
    await admin
      .from("insurer_profiles")
      .update({
        stripe_sub_id: sub.id,
        billing_period_end: periodEnd,
      })
      .eq("id", loc.userId);
  }
}

async function clearSubscription(sub: Stripe.Subscription) {
  const loc = await findProfileByStripeSubscriptionId(sub.id);
  if (!loc) {
    return;
  }
  const admin = createServiceRoleClient();
  await admin
    .from(loc.table)
    .update({ stripe_sub_id: null })
    .eq("id", loc.userId);
}

async function onInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) {
    return;
  }

  const customerId = getCustomerId(invoice.customer);
  if (!customerId) {
    return;
  }
  const loc = await findProfileByStripeCustomerId(customerId);
  if (!loc) {
    return;
  }
  const admin = createServiceRoleClient();

  if (loc.role === "patient") {
    await admin
      .from("patient_profiles")
      .update({ connections_used: 0 })
      .eq("id", loc.userId);
    return;
  }

  if (loc.role === "insurer") {
    await admin
      .from("insurer_profiles")
      .update({ cases_used_month: 0 })
      .eq("id", loc.userId);
  }
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = getCustomerId(invoice.customer);
  if (!customerId) {
    return;
  }
  const loc = await findProfileByStripeCustomerId(customerId);
  if (!loc) {
    return;
  }

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", loc.userId)
    .maybeSingle();

  if (!profile?.email) {
    return;
  }

  if (!process.env.RESEND_API_KEY?.trim()) {
    console.warn("[stripe webhook] RESEND_API_KEY missing — skip payment email");
    return;
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() || "onboarding@resend.dev";

  try {
    await resend.emails.send({
      from,
      to: profile.email,
      subject: "CareMatch Global — payment failed",
      text: `Hi ${profile.full_name || "there"},

We could not process your latest CareMatch Global payment. Please update your payment method in the billing portal to keep your subscription active.

If you already fixed this, you can ignore this message.

— CareMatch Global`,
    });
  } catch (e) {
    console.error("[stripe webhook] Resend error", e);
  }
}

function isPlaceholderWebhookSecret(secret: string): boolean {
  const s = secret.trim();
  if (!s) {
    return true;
  }
  if (s === "whsec_placeholder") {
    return true;
  }
  if (/placeholder/i.test(s)) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  const placeholder = isPlaceholderWebhookSecret(secret);

  let event: Stripe.Event;

  if (!placeholder) {
    if (!secret.startsWith("whsec_")) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET must be a Stripe signing secret (whsec_...)." },
        { status: 500 },
      );
    }
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid signature";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    console.warn(
      "[stripe webhook] STRIPE_WEBHOOK_SECRET is missing or still a placeholder; " +
        "signature verification is skipped (development only). Set a real whsec_ secret in production.",
    );
    if (sig && secret.startsWith("whsec_") && secret !== "whsec_placeholder") {
      try {
        event = stripe.webhooks.constructEvent(rawBody, sig, secret);
      } catch {
        try {
          event = JSON.parse(rawBody) as Stripe.Event;
        } catch {
          return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
        }
      }
    } else {
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await applySubscriptionUpsert(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await clearSubscription(sub);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await onInvoicePaymentSucceeded(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await onInvoicePaymentFailed(invoice);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe webhook] handler error", e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
