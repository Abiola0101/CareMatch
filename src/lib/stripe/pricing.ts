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
    monthly: envPrice(
      "STRIPE_PRICE_PATIENT_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_MONTHLY",
      "STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
      "STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
    ),
    annual: envPrice(
      "STRIPE_PRICE_PATIENT_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ANNUAL",
      "STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
      "STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
    ),
  },
  specialist: {
    monthly: envPrice(
      "STRIPE_PRICE_SPECIALIST_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_MONTHLY",
      "STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_LISTED_MONTHLY",
    ),
    annual: envPrice(
      "STRIPE_PRICE_SPECIALIST_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_ANNUAL",
      "STRIPE_PRICE_SPECIALIST_LISTED_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_SPECIALIST_LISTED_ANNUAL",
    ),
  },
  insurer: {
    monthly: envPrice(
      "STRIPE_PRICE_INSURER_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_INSURER_MONTHLY",
    ),
    annual: envPrice(
      "STRIPE_PRICE_INSURER_ANNUAL",
      "NEXT_PUBLIC_STRIPE_PRICE_INSURER_ANNUAL",
    ),
  },
  patientOverage: envPrice(
    "STRIPE_PRICE_PATIENT_OVERAGE",
    "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_OVERAGE",
  ),
} as const;

export type PatientTier = "patient";
export type SpecialistTier = "specialist";
export type InsurerTier = "insurer";

export const PATIENT_CONNECTIONS_LIMIT = 999;

/** Every env-backed patient subscription price id (for webhook + checkout matching). */
const PATIENT_PRICE_ENV_KEYS = [
  "STRIPE_PRICE_PATIENT_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_MONTHLY",
  "STRIPE_PRICE_PATIENT_ANNUAL",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ANNUAL",
  "STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_MONTHLY",
  "STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_ESSENTIAL_ANNUAL",
  "STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_MONTHLY",
  "STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_STANDARD_ANNUAL",
  "STRIPE_PRICE_PATIENT_PREMIUM_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_PREMIUM_MONTHLY",
  "STRIPE_PRICE_PATIENT_PREMIUM_ANNUAL",
  "NEXT_PUBLIC_STRIPE_PRICE_PATIENT_PREMIUM_ANNUAL",
] as const;

export function allConfiguredPatientPriceIds(): string[] {
  const ids = new Set<string>();
  for (const k of PATIENT_PRICE_ENV_KEYS) {
    const v = process.env[k]?.trim();
    if (v) ids.add(v);
  }
  if (stripePriceIds.patient.monthly) ids.add(stripePriceIds.patient.monthly);
  if (stripePriceIds.patient.annual) ids.add(stripePriceIds.patient.annual);
  return Array.from(ids);
}

/**
 * Maps Stripe price + metadata to patient_profiles.subscription_tier CHECK values.
 */
export function patientDbSubscriptionTier(
  priceId: string | null,
  metadata?: Record<string, string> | null,
): "essential" | "standard" | "premium" | null {
  const plan = metadata?.carematch_patient_plan?.toLowerCase().trim();
  if (plan === "essential" || plan === "standard" || plan === "premium") {
    return plan;
  }
  if (!priceId) {
    return null;
  }
  for (const key of Object.keys(process.env)) {
    const v = process.env[key]?.trim();
    if (!v || v !== priceId) continue;
    if (!/^STRIPE_PRICE_PATIENT|^NEXT_PUBLIC_STRIPE_PRICE_PATIENT/i.test(key)) {
      continue;
    }
    const ku = key.toUpperCase();
    if (ku.includes("ESSENTIAL")) return "essential";
    if (ku.includes("STANDARD")) return "standard";
    if (ku.includes("PREMIUM")) return "premium";
  }
  if (allConfiguredPatientPriceIds().includes(priceId)) {
    return "standard";
  }
  return null;
}

export function patientConnectionsLimitFromMetadata(
  metadata: Record<string, string> | null | undefined,
  fallback: number,
): number {
  const raw = metadata?.carematch_connections_limit?.trim();
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return n;
}

const ALL_SUBSCRIPTION_PRICE_IDS: string[] = [
  ...allConfiguredPatientPriceIds(),
  stripePriceIds.specialist.monthly,
  stripePriceIds.specialist.annual,
  stripePriceIds.insurer.monthly,
  stripePriceIds.insurer.annual,
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
    return allConfiguredPatientPriceIds().includes(priceId);
  }
  if (role === "specialist") {
    return (
      priceId === stripePriceIds.specialist.monthly ||
      priceId === stripePriceIds.specialist.annual
    );
  }
  if (role === "insurer") {
    return (
      priceId === stripePriceIds.insurer.monthly ||
      priceId === stripePriceIds.insurer.annual
    );
  }
  return false;
}

/** Connections cap for patient tier. */
export function connectionsLimitForPatientTier(_tier: PatientTier): number {
  return PATIENT_CONNECTIONS_LIMIT;
}

/**
 * Resolve tier + connections from Stripe Price id or optional metadata (tier key).
 */
export function patientTierFromPriceId(
  priceId: string,
  metadataTier?: string | null,
): { tier: PatientTier; connectionsLimit: number } | null {
  const normalized = metadataTier?.toLowerCase().trim();
  if (normalized === "patient") {
    return { tier: "patient", connectionsLimit: PATIENT_CONNECTIONS_LIMIT };
  }

  if (allConfiguredPatientPriceIds().includes(priceId)) {
    return { tier: "patient", connectionsLimit: PATIENT_CONNECTIONS_LIMIT };
  }
  return null;
}

export function specialistTierFromPriceId(
  priceId: string,
  metadataTier?: string | null,
): "specialist" | null {
  const t = metadataTier?.toLowerCase().trim();
  if (t === "specialist") {
    return "specialist";
  }
  if (
    priceId === stripePriceIds.specialist.monthly ||
    priceId === stripePriceIds.specialist.annual
  ) {
    return "specialist";
  }
  return null;
}

export function insurerTierFromPriceId(
  priceId: string,
  metadataTier?: string | null,
): "insurer" | null {
  const t = metadataTier?.toLowerCase().trim();
  if (t === "insurer") {
    return "insurer";
  }
  if (
    priceId === stripePriceIds.insurer.monthly ||
    priceId === stripePriceIds.insurer.annual
  ) {
    return "insurer";
  }
  return null;
}

export function patientCheckoutPriceId(
  billing: "monthly" | "annual",
): string {
  return billing === "monthly"
    ? stripePriceIds.patient.monthly
    : stripePriceIds.patient.annual;
}

export function specialistCheckoutPriceId(
  billing: "monthly" | "annual",
): string {
  return billing === "monthly"
    ? stripePriceIds.specialist.monthly
    : stripePriceIds.specialist.annual;
}

export function insurerCheckoutPriceId(
  billing: "monthly" | "annual",
): string {
  return billing === "monthly"
    ? stripePriceIds.insurer.monthly
    : stripePriceIds.insurer.annual;
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
    const dbTier = patientDbSubscriptionTier(args.priceId, null);
    if (dbTier) {
      base.carematch_patient_plan = dbTier;
    }
  } else if (args.role === "specialist") {
    const st = specialistTierFromPriceId(args.priceId, null);
    if (st) {
      base.carematch_tier = st;
    }
  } else if (args.role === "insurer") {
    const it = insurerTierFromPriceId(args.priceId, null);
    if (it) {
      base.carematch_tier = it;
    }
  }

  return base;
}
