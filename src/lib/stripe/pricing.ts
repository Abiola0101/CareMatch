/**
 * Stripe Price IDs from env. Supports STRIPE_PRICE_* (server) or NEXT_PUBLIC_STRIPE_PRICE_* (shared).
 */
function envPrice(...keys: string[]): string {
  for (const k of keys) {
    const v = process.env[k];
    if (v?.trim()) return v.trim();
  }
  return "";
}

export const stripePriceIds = {
  patient: {
    essential: {
      monthly: envPrice(
        "STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
        "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
      ),
      annual: envPrice(
        "STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
        "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
      ),
    },
    standard: {
      monthly: envPrice(
        "STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
        "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
      ),
      annual: envPrice(
        "STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
        "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
      ),
    },
  },
  specialist: {
    listed: {
      monthly: envPrice(
        "STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY",
        "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY",
      ),
    },
  },
  patientOverage: envPrice(
    "STRIPE_PRICE_PATIENT_OVERAGE",
    "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_OVERAGE",
  ),
} as const;

export type PatientTier = "essential" | "standard" | "premium";

const ALL_SUBSCRIPTION_PRICE_IDS: string[] = [
  stripePriceIds.patient.essential.monthly,
  stripePriceIds.patient.essential.annual,
  stripePriceIds.patient.standard.monthly,
  stripePriceIds.patient.standard.annual,
  stripePriceIds.specialist.listed.monthly,
].filter(Boolean);

export function isSubscriptionCheckoutPriceId(priceId: string): boolean {
  return ALL_SUBSCRIPTION_PRICE_IDS.includes(priceId);
}

export function priceIdAllowedForRole(
  priceId: string,
  role: string,
): boolean {
  if (!priceId || !isSubscriptionCheckoutPriceId(priceId)) {
    return false;
  }
  if (role === "patient") {
    return (
      priceId === stripePriceIds.patient.essential.monthly ||
      priceId === stripePriceIds.patient.essential.annual ||
      priceId === stripePriceIds.patient.standard.monthly ||
      priceId === stripePriceIds.patient.standard.annual
    );
  }
  if (role === "specialist") {
    return priceId === stripePriceIds.specialist.listed.monthly;
  }
  return false;
}

/** Connections cap for patient tiers; premium when a price maps to premium (future). */
export function connectionsLimitForPatientTier(tier: PatientTier): number {
  switch (tier) {
    case "essential":
      return 3;
    case "standard":
      return 8;
    case "premium":
      return 999;
    default:
      return 3;
  }
}

/**
 * Resolve tier + connections from Stripe Price id or optional metadata (tier key).
 */
export function patientTierFromPriceId(
  priceId: string,
  metadataTier?: string | null,
): { tier: PatientTier; connectionsLimit: number } | null {
  const normalized = metadataTier?.toLowerCase().trim();
  if (normalized === "essential" || normalized === "standard" || normalized === "premium") {
    const tier = normalized as PatientTier;
    return { tier, connectionsLimit: connectionsLimitForPatientTier(tier) };
  }

  if (priceId === stripePriceIds.patient.essential.monthly ||
      priceId === stripePriceIds.patient.essential.annual) {
    return { tier: "essential", connectionsLimit: 3 };
  }
  if (priceId === stripePriceIds.patient.standard.monthly ||
      priceId === stripePriceIds.patient.standard.annual) {
    return { tier: "standard", connectionsLimit: 8 };
  }
  return null;
}

export function specialistTierFromPriceId(
  priceId: string,
  metadataTier?: string | null,
): "listed" | "featured" | "network" | null {
  const t = metadataTier?.toLowerCase().trim();
  if (t === "listed" || t === "featured" || t === "network") {
    return t;
  }
  if (priceId === stripePriceIds.specialist.listed.monthly) {
    return "listed";
  }
  return null;
}

export function patientCheckoutPriceId(
  tier: "essential" | "standard",
  billing: "monthly" | "annual",
): string {
  if (tier === "essential") {
    return billing === "monthly"
      ? stripePriceIds.patient.essential.monthly
      : stripePriceIds.patient.essential.annual;
  }
  return billing === "monthly"
    ? stripePriceIds.patient.standard.monthly
    : stripePriceIds.patient.standard.annual;
}

export function specialistListedPriceId(): string {
  return stripePriceIds.specialist.listed.monthly;
}

export function getCheckoutSubscriptionMetadata(args: {
  priceId: string;
  userId: string;
  role: string;
}): Record<string, string> {
  const base: Record<string, string> = {
    supabase_user_id: args.userId,
    supabase_role: args.role,
  };

  if (args.role === "patient") {
    const resolved = patientTierFromPriceId(args.priceId, null);
    if (resolved) {
      base.carematch_tier = resolved.tier;
      base.carematch_connections_limit = String(resolved.connectionsLimit);
    }
  } else if (args.role === "specialist") {
    const st = specialistTierFromPriceId(args.priceId, null);
    if (st) {
      base.carematch_tier = st;
    }
  }

  return base;
}
