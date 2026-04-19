/**
 * Client helpers — prefer price IDs from GET /api/stripe/prices when available.
 */

export type StripePricesPayload = {
  patient: { monthly: string; annual: string };
  specialist: { monthly: string; annual: string };
  insurer: { monthly: string; annual: string };
  patientOverage: string;
};

export function patientPriceId(
  prices: StripePricesPayload,
  billing: "monthly" | "annual",
): string {
  return billing === "monthly" ? prices.patient.monthly : prices.patient.annual;
}

export function specialistPriceId(
  prices: StripePricesPayload,
  billing: "monthly" | "annual",
): string {
  return billing === "monthly" ? prices.specialist.monthly : prices.specialist.annual;
}

export function insurerPriceId(
  prices: StripePricesPayload,
  billing: "monthly" | "annual",
): string {
  return billing === "monthly" ? prices.insurer.monthly : prices.insurer.annual;
}

/** Patient checkout: monthly price must be configured. */
export function patientPricesAreConfigured(prices: StripePricesPayload | null): boolean {
  if (!prices) {
    return false;
  }
  return !!prices.patient.monthly;
}

/** Specialist checkout: monthly price must be configured. */
export function specialistPricesAreConfigured(prices: StripePricesPayload | null): boolean {
  if (!prices) {
    return false;
  }
  return !!prices.specialist.monthly;
}

/** Insurer checkout: monthly price must be configured. */
export function insurerPricesAreConfigured(prices: StripePricesPayload | null): boolean {
  if (!prices) {
    return false;
  }
  return !!prices.insurer.monthly;
}

/** True only when patient, specialist, and insurer subscription prices all exist. */
export function pricesAreConfigured(prices: StripePricesPayload | null): boolean {
  return (
    patientPricesAreConfigured(prices) &&
    specialistPricesAreConfigured(prices) &&
    insurerPricesAreConfigured(prices)
  );
}

