import { NextResponse } from "next/server";
import { stripePriceIds } from "@/lib/stripe/pricing";

export const dynamic = "force-dynamic";

/**
 * Exposes Stripe Price IDs to the client.
 * Reads env vars at request time (not build time) so Vercel env vars are always picked up.
 */
export async function GET() {
  return NextResponse.json(stripePriceIds);
}
