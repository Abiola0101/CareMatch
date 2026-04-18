import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function env(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v?.trim()) return v.trim();
  }
  return "";
}

/**
 * Exposes Stripe Price IDs to the client.
 * Reads env vars at request time (not build time) so Vercel env vars are always picked up.
 */
export async function GET() {
  return NextResponse.json({
    patient: {
      monthly: env("STRIPE_PRICE_PATIENT_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_MONTHLY"),
      annual: env("STRIPE_PRICE_PATIENT_ANNUAL", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ANNUAL"),
    },
    specialist: {
      monthly: env("STRIPE_PRICE_SPECIALIST_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_MONTHLY"),
      annual: env("STRIPE_PRICE_SPECIALIST_ANNUAL", "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_ANNUAL"),
    },
    insurer: {
      monthly: env("STRIPE_PRICE_INSURER_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_INSURER_MONTHLY"),
      annual: env("STRIPE_PRICE_INSURER_ANNUAL", "NEXT_PUBLIC_STRIPE_PRICE_INSURER_ANNUAL"),
    },
    patientOverage: env("STRIPE_PRICE_PATIENT_OVERAGE", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_OVERAGE"),
  });
}
