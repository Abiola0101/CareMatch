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
      essential: {
        monthly: env("STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY"),
        annual: env("STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL"),
      },
      standard: {
        monthly: env("STRIPE_PRICE_PATIENT_STANDARD_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_MONTHLY"),
        annual: env("STRIPE_PRICE_PATIENT_STANDARD_ANNUAL", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_ANNUAL"),
      },
    },
    specialist: {
      listed: {
        monthly: env("STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY", "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY"),
      },
    },
    patientOverage: env("STRIPE_PRICE_PATIENT_OVERAGE", "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_OVERAGE"),
  });
}
