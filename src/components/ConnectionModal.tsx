"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type { StripeCardElement } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MODE_OPTIONS: {
  value: "remote" | "telemedicine" | "medical_travel" | "fly_doctor";
  label: string;
}[] = [
  { value: "remote", label: "Remote second opinion" },
  { value: "telemedicine", label: "Telemedicine" },
  { value: "medical_travel", label: "Medical travel" },
  { value: "fly_doctor", label: "Fly the doctor" },
];

export type ConnectionModalSpecialist = {
  specialist_id: string;
  full_name: string;
  title?: string | null;
  institution?: string | null;
  match_score?: number | null;
  avatar_url?: string | null;
  care_modes: { mode: string; available: string | null }[];
};

type Usage = { used: number; limit: number };

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string;
  specialist: ConnectionModalSpecialist;
  onSuccess?: () => void;
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

/** Salutation line, e.g. "Dr. Chen" when the profile name has no title. */
function doctorLine(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "Your specialist";
  if (/^(dr\.?|doctor)\b/i.test(t)) return t;
  const parts = t.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? t;
  return `Dr. ${last}`;
}

const SUCCESS_MS = 2800;

export function ConnectionModal({
  open,
  onClose,
  caseId,
  specialist,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [preferredMode, setPreferredMode] = useState<
    "remote" | "telemedicine" | "medical_travel" | "fly_doctor" | ""
  >("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const cardMountRef = useRef<HTMLDivElement>(null);
  const [payPhase, setPayPhase] = useState<"idle" | "card" | "ready">("idle");

  const availableModes = MODE_OPTIONS.filter((opt) => {
    const row = specialist.care_modes.find((c) => c.mode === opt.value);
    if (!row) return false;
    return row.available === "yes" || row.available === "conditional";
  });

  /** If specialist has no care-mode rows, still let the patient pick a preference. */
  const displayModes =
    availableModes.length > 0 ? availableModes : MODE_OPTIONS;
  const careModesMissing = (specialist.care_modes ?? []).length === 0;

  const resetPaymentUi = useCallback(() => {
    cardRef.current?.destroy();
    cardRef.current = null;
    setClientSecret(null);
    setStripe(null);
    setPayPhase("idle");
  }, []);

  useEffect(() => {
    if (!open) {
      setMessage("");
      setPreferredMode("");
      setErr(null);
      setSuccess(false);
      setLoadErr(null);
      resetPaymentUi();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/patient/connections", { credentials: "include" });
        const data = (await res.json()) as {
          usage?: Usage;
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setLoadErr(data.error ?? "Could not load usage.");
          return;
        }
        if (!cancelled && data.usage) setUsage(data.usage);
      } catch {
        if (!cancelled) setLoadErr("Network error loading usage.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, resetPaymentUi]);

  useLayoutEffect(() => {
    if (!open || !clientSecret || !stripe) return;
    const el = cardMountRef.current;
    if (!el) return;
    if (cardRef.current) return;
    const elements = stripe.elements();
    const card = elements.create("card", {
      style: {
        base: {
          fontSize: "16px",
          color: "#0a0a0a",
          "::placeholder": { color: "#737373" },
        },
      },
    });
    card.mount(el);
    cardRef.current = card;
    setPayPhase("ready");
    return () => {
      card.destroy();
      cardRef.current = null;
    };
  }, [open, clientSecret, stripe]);

  const atLimit = usage != null && usage.used >= usage.limit;
  const remaining = usage != null ? Math.max(0, usage.limit - usage.used) : 0;

  const preparePayment = async () => {
    setErr(null);
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pk?.trim()) {
      setErr("Stripe publishable key is not configured.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/connection-overage-intent", {
        method: "POST",
        credentials: "include",
      });
      const data = (await res.json()) as {
        clientSecret?: string;
        publishableKey?: string | null;
        error?: string;
      };
      if (!res.ok || !data.clientSecret) {
        setErr(data.error ?? "Could not start payment.");
        setBusy(false);
        return;
      }
      const s = await loadStripe(data.publishableKey ?? pk);
      if (!s) {
        setErr("Could not load Stripe.");
        setBusy(false);
        return;
      }
      setStripe(s);
      setClientSecret(data.clientSecret);
      setPayPhase("card"); // useEffect mounts card → sets "ready"
    } catch {
      setErr("Payment setup failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitConnection = async (paymentIntentId?: string) => {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/patient/connections", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: caseId,
          specialist_id: specialist.specialist_id,
          preferred_mode: preferredMode,
          message: message.trim(),
          payment_intent_id: paymentIntentId,
        }),
      });
      const data = (await res.json()) as { error?: string; code?: string; connection?: unknown };
      if (res.status === 402 && data.code === "CONNECTION_LIMIT") {
        setErr(data.error ?? "Connection limit reached.");
        setBusy(false);
        return;
      }
      if (!res.ok) {
        setErr(data.error ?? "Request failed.");
        setBusy(false);
        return;
      }
      setSuccess(true);
      router.refresh();
      // Do not call onSuccess/onClose yet — parent clears `connectSpecialist` and
      // unmounts this modal immediately, which skips the success UI.
      window.setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
        onClose();
      }, SUCCESS_MS);
    } catch {
      setErr("Network error.");
    } finally {
      setBusy(false);
    }
  };

  const onPrimaryAction = async () => {
    if (!preferredMode) {
      setErr("Select a care mode.");
      return;
    }
    if (message.trim().length < 20 || message.trim().length > 500) {
      setErr("Message must be between 20 and 500 characters.");
      return;
    }

    if (!atLimit) {
      await submitConnection();
      return;
    }

    if (payPhase === "idle") {
      await preparePayment();
      return;
    }

    if (payPhase === "card" && !clientSecret) {
      await preparePayment();
      return;
    }

    if (!stripe || !clientSecret || !cardRef.current) {
      setErr("Payment form is not ready yet.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: { card: cardRef.current },
        },
      );
      if (error || !paymentIntent || paymentIntent.status !== "succeeded") {
        setErr(error?.message ?? "Payment did not succeed.");
        setBusy(false);
        return;
      }
      await submitConnection(paymentIntent.id);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Payment failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const primaryLabel = atLimit
    ? payPhase === "idle"
      ? "Pay $35 and send connection request"
      : payPhase === "ready"
        ? "Confirm $35 payment and send request"
        : "Preparing card form…"
    : "Send connection request";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connection-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/50"
        aria-label="Close"
        onClick={() => {
          if (!success) onClose();
        }}
      />
      <div className="relative z-10 max-h-[90vh] w-full min-w-0 max-w-lg overflow-y-auto rounded-xl border bg-background p-4 shadow-lg pointer-events-auto sm:p-6">
        <h2 id="connection-modal-title" className="text-lg font-semibold">
          Connect with {specialist.full_name}
        </h2>

        <div className="mt-4 flex items-center gap-4">
          {specialist.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={specialist.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials(specialist.full_name)}
            </div>
          )}
          <div className="min-w-0 text-sm">
            <p className="font-medium">{specialist.title ?? "Specialist"}</p>
            {specialist.institution ? (
              <p className="text-muted-foreground">{specialist.institution}</p>
            ) : null}
            {specialist.match_score != null ? (
              <p className="text-muted-foreground">
                Match score: {Math.round(Number(specialist.match_score))}
              </p>
            ) : null}
          </div>
        </div>

        {loadErr ? (
          <p className="mt-4 text-sm text-destructive">{loadErr}</p>
        ) : null}

        {success ? (
          <div
            className="mt-6 rounded-lg border border-emerald-600/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/30 dark:text-emerald-50"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">
              Connection request sent
            </p>
            <p className="mt-2 leading-relaxed text-emerald-900/95 dark:text-emerald-50/95">
              {doctorLine(specialist.full_name)} will be notified, and you will receive
              an email when they respond.
            </p>
            <p className="mt-3 text-xs text-emerald-800/80 dark:text-emerald-200/80">
              This window will close in a few seconds…
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-3">
              <Label>Preferred care mode</Label>
              {careModesMissing ? (
                <p className="text-xs text-muted-foreground">
                  This specialist has not listed delivery preferences yet — choose the
                  option that best matches what you are looking for.
                </p>
              ) : null}
              <div className="grid gap-2">
                {displayModes.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm",
                      preferredMode === opt.value && "border-primary bg-primary/5",
                    )}
                  >
                    <input
                      type="radio"
                      name="care-mode"
                      className="mt-1"
                      checked={preferredMode === opt.value}
                      onChange={() => setPreferredMode(opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <Label htmlFor="conn-msg">Introduce yourself and your situation</Label>
              <Textarea
                id="conn-msg"
                rows={5}
                maxLength={500}
                placeholder="Briefly describe what you are hoping the specialist can help you with."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {message.length} / 500 (minimum 20)
              </p>
            </div>

            {usage && (
              <div className="mt-6 rounded-md border bg-muted/30 px-3 py-3 text-sm">
                {!atLimit ? (
                  <p>
                    This will use 1 of your{" "}
                    <span className="font-semibold">{remaining}</span> remaining
                    connection{remaining === 1 ? "" : "s"} this month.
                  </p>
                ) : (
                  <div className="space-y-2 text-amber-950 dark:text-amber-100">
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      You have used all {usage.limit} connections included in your plan
                      this month.
                    </p>
                    <p>Additional connections cost $35 each.</p>
                  </div>
                )}
              </div>
            )}

            {atLimit && payPhase !== "idle" ? (
              <div className="mt-4 space-y-2">
                <Label>Card details</Label>
                <div
                  ref={cardMountRef}
                  className="rounded-md border bg-background px-3 py-3"
                />
              </div>
            ) : null}

            {err ? <p className="mt-4 text-sm text-destructive">{err}</p> : null}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={
                  busy ||
                  !preferredMode ||
                  message.trim().length < 20
                }
                onClick={() => void onPrimaryAction()}
              >
                {busy ? "Working…" : primaryLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
