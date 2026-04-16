/**
 * Client helpers — prefer price IDs from GET /api/stripe/prices when available.
 */

export type StripePricesPayload = {
  patient: {
    essential: { monthly: string; annual: string };
    standard: { monthly: string; annual: string };
  };
  specialist: { listed: { monthly: string } };
  patientOverage: string;
};

export function patientPriceId(
  prices: StripePricesPayload,
  tier: "essential" | "standard",
  billing: "monthly" | "annual",
): string {
  if (tier === "essential") {
    return billing === "monthly"
      ? prices.patient.essential.monthly
      : prices.patient.essential.annual;
  }
  return billing === "monthly"
    ? prices.patient.standard.monthly
    : prices.patient.standard.annual;
}

export function specialistListedPriceId(prices: StripePricesPayload): string {
  return prices.specialist.listed.monthly;
}

/** Patient checkout: monthly tiers must be configured (annual optional until selected). */
export function patientPricesAreConfigured(prices: StripePricesPayload | null): boolean {
  if (!prices) {
    return false;
  }
  return !!prices.patient.essential.monthly && !!prices.patient.standard.monthly;
}

/** Specialist Listed monthly price id from env / prices API. */
export function specialistPricesAreConfigured(prices: StripePricesPayload | null): boolean {
  if (!prices) {
    return false;
  }
  return !!prices.specialist.listed.monthly;
}

/** True only when both patient and specialist subscription prices exist (rarely needed on the client). */
export function pricesAreConfigured(prices: StripePricesPayload | null): boolean {
  return patientPricesAreConfigured(prices) && specialistPricesAreConfigured(prices);
}
