import { NextResponse } from "next/server";
import { stripePriceIds } from "@/lib/stripe/pricing";

export const dynamic = "force-dynamic";

/**
 * Exposes Stripe Price IDs to the client without duplicating NEXT_PUBLIC_* env vars.
 * Server-only STRIPE_PRICE_* values are read here.
 */
export async function GET() {
  return NextResponse.json({
    patient: stripePriceIds.patient,
    specialist: stripePriceIds.specialist,
    patientOverage: stripePriceIds.patientOverage,
  });
}
