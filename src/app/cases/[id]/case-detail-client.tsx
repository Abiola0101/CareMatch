"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import {
  ChevronDown,
  ChevronUp,
  Monitor,
  Plane,
  Stethoscope,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { countryFlagEmoji } from "@/lib/geo/country-flag";
import { cn } from "@/lib/utils";
import type {
  CareModeRow,
  MatchResultDetail,
  PatientCaseDetail,
} from "@/lib/patient/case-detail";
import { ConnectionModal } from "@/components/ConnectionModal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ModeFilter = "all" | "remote" | "telemedicine" | "travel" | "fly";

const MODE_TABS: { id: ModeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "remote", label: "Remote" },
  { id: "telemedicine", label: "Telemedicine" },
  { id: "travel", label: "Medical travel" },
  { id: "fly", label: "Fly doctor" },
];

const CARE_MODE_KEYS = [
  "remote",
  "telemedicine",
  "medical_travel",
  "fly_doctor",
] as const;

const MATRIX_MODE_LABEL: Record<string, string> = {
  remote: "Remote",
  telemedicine: "Telemedicine",
  medical_travel: "Medical travel",
  fly_doctor: "Fly the doctor",
};

function modeKey(f: ModeFilter): string | null {
  const m: Record<ModeFilter, string | null> = {
    all: null,
    remote: "remote",
    telemedicine: "telemedicine",
    travel: "medical_travel",
    fly: "fly_doctor",
  };
  return m[f];
}

function passesModeFilter(m: MatchResultDetail, f: ModeFilter): boolean {
  if (f === "all") return true;
  const want = modeKey(f);
  if (!want) return true;
  const row = m.care_modes.find((c) => c.mode === want);
  if (!row) return false;
  return row.available === "yes" || row.available === "conditional";
}

function getModeRow(
  modes: CareModeRow[],
  key: string,
): CareModeRow | undefined {
  return modes.find((c) => c.mode === key);
}

/** Collapsed row icons: green / amber / red / grey */
function modeIconTone(
  available: string | null | undefined,
  hasRow: boolean,
): "green" | "amber" | "red" | "grey" {
  if (!hasRow) return "grey";
  if (available === "yes") return "green";
  if (available === "conditional") return "amber";
  if (available === "no") return "red";
  return "grey";
}

const toneClass: Record<
  "green" | "amber" | "red" | "grey",
  string
> = {
  green: "text-emerald-600",
  amber: "text-amber-500",
  red: "text-red-600",
  grey: "text-muted-foreground",
};

function ModeGlyph({ mode }: { mode: string }) {
  const cls = "h-5 w-5";
  switch (mode) {
    case "remote":
      return <Monitor className={cls} />;
    case "telemedicine":
      return <Video className={cls} />;
    case "medical_travel":
      return <Plane className={cls} />;
    case "fly_doctor":
      return <Stethoscope className={cls} />;
    default:
      return null;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function lastName(full: string): string {
  const p = full.trim().split(/\s+/);
  return p[p.length - 1] ?? full;
}

function formatPrivilegeType(t: string | null): string {
  switch (t) {
    case "full_surgical":
      return "Full surgical";
    case "active_surgical":
      return "Active surgical";
    case "consulting":
      return "Consulting only";
    case "visiting_surgical":
      return "Visiting surgical";
    default:
      return t?.replace(/_/g, " ") ?? "—";
  }
}

function statusBadge(available: string | null | undefined) {
  if (available === "yes") {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Available
      </span>
    );
  }
  if (available === "conditional") {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-700">
        <span className="h-2 w-2 rounded-full bg-amber-500" />
        Conditional
      </span>
    );
  }
  if (available === "no") {
    return (
      <span className="inline-flex items-center gap-1.5 text-red-700">
        <span className="h-2 w-2 rounded-full bg-red-500" />
        Not available
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
      No data
    </span>
  );
}

/**
 * Returns true when the availability score signals the specialist's wait time
 * is unlikely to meet the patient's stated urgency.
 *   within_1_week  + score_avail ≤ 5  → wait > 14 days
 *   within_4_weeks + score_avail ≤ 4  → wait > 60 days
 */
function isAvailabilityMismatch(
  urgency: string | null,
  scoreAvail: number | null,
): boolean {
  if (scoreAvail == null) return false;
  if (urgency === "within_1_week") return scoreAvail <= 5;
  if (urgency === "within_4_weeks") return scoreAvail <= 4;
  return false;
}

const COMPAT_DIMS: {
  key: keyof Pick<
    MatchResultDetail,
    | "score_clinical"
    | "score_subspec"
    | "score_volume"
    | "score_avail"
    | "score_outcomes"
  >;
  label: string;
  max: number;
}[] = [
  { key: "score_clinical", label: "Clinical fit", max: 30 },
  { key: "score_subspec", label: "Sub-specialty depth", max: 25 },
  { key: "score_volume", label: "Case volume", max: 20 },
  { key: "score_avail", label: "Availability", max: 15 },
  { key: "score_outcomes", label: "Outcomes", max: 10 },
];

type EditForm = {
  condition_summary: string;
  urgency: string;
  additional_notes: string;
};

export function CaseDetailClient({
  initial,
  caseId,
  variant = "patient",
  backHref = "/dashboard",
}: {
  initial: PatientCaseDetail;
  caseId: string;
  variant?: "patient" | "insurer";
  backHref?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [data, setData] = useState(initial);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectSpecialist, setConnectSpecialist] =
    useState<MatchResultDetail | null>(null);

  const form = useForm<EditForm>({
    defaultValues: {
      condition_summary: initial.case.condition_summary ?? "",
      urgency: initial.case.urgency ?? "routine",
      additional_notes: initial.case.additional_notes ?? "",
    },
  });

  useEffect(() => {
    setData(initial);
  }, [initial]);

  const onRematch = async () => {
    setRematchError(null);
    setRematchBusy(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setRematchError("Your session has expired. Please sign in again.");
      setRematchBusy(false);
      return;
    }
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/api/match/run`
          : "/api/match/run";
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({ case_id: caseId }),
      });
      const raw = await res.text();
      let payload: { success?: boolean; error?: string } = {};
      if (raw.trim()) {
        try {
          payload = JSON.parse(raw) as { success?: boolean; error?: string };
        } catch {
          setRematchError("Could not read matching response.");
          setRematchBusy(false);
          return;
        }
      }
      if (!res.ok) {
        setRematchError(payload.error ?? "Matching failed.");
        setRematchBusy(false);
        return;
      }
      setRematchBusy(false);
      startTransition(() => router.refresh());
    } catch {
      setRematchError("Network error. Try again.");
      setRematchBusy(false);
    }
  };

  const visible = useMemo(() => {
    const sorted = [...data.matches].sort(
      (a, b) => (b.match_score ?? 0) - (a.match_score ?? 0),
    );
    return sorted
      .filter((m) => passesModeFilter(m, modeFilter))
      .slice(0, 10);
  }, [data.matches, modeFilter]);

  const hasMatches = data.matches.length > 0;

  const onSaveCase = async (v: EditForm) => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("patient_cases")
      .update({
        condition_summary: v.condition_summary,
        urgency: v.urgency as "routine" | "within_4_weeks" | "within_1_week",
        additional_notes: v.additional_notes || null,
      })
      .eq("id", caseId);

    setSaving(false);
    if (!error) {
      setDrawer(false);
      setData((d) => ({
        ...d,
        case: {
          ...d.case,
          condition_summary: v.condition_summary,
          urgency: v.urgency,
          additional_notes: v.additional_notes || null,
        },
      }));
      startTransition(() => router.refresh());
    }
  };

  const formatUrgency = (u: string | null) => {
    if (u === "routine") return "Routine (within a few months)";
    if (u === "within_4_weeks") return "Within 4 weeks";
    if (u === "within_1_week") return "Within 1 week (urgent)";
    return u ?? "—";
  };

  return (
    <div className="relative mx-auto min-w-0 max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
      <div className="mb-6">
        <Link
          href={backHref}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </div>

      <Card className="mb-8">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-xl sm:text-2xl">Case overview</CardTitle>
            <CardDescription>
              Created{" "}
              {new Date(data.case.created_at).toLocaleString()} ·{" "}
              {data.case.specialty
                ? data.case.specialty.charAt(0).toUpperCase() +
                  data.case.specialty.slice(1)
                : "—"}
            </CardDescription>
          </div>
          {variant === "patient" ? (
            <Button type="button" variant="outline" onClick={() => setDrawer(true)}>
              Update case
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="font-medium">Urgency: </span>
            {formatUrgency(data.case.urgency)}
          </div>
          <div>
            <span className="font-medium">Condition summary</span>
            <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
              {data.case.condition_summary ?? "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-2 flex flex-wrap gap-2">
        {MODE_TABS.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={modeFilter === t.id ? "secondary" : "outline"}
            onClick={() => setModeFilter(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <h2 className="mb-4 text-xl font-semibold">Match results</h2>

      {!hasMatches ? (
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No specialists found for your case yet. Our specialist pool is growing —
            check back soon.
          </p>
          {rematchError ? (
            <p className="mt-4 text-sm text-destructive">{rematchError}</p>
          ) : null}
          {variant === "patient" ? (
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                type="button"
                disabled={rematchBusy}
                onClick={() => void onRematch()}
              >
                {rematchBusy ? "Finding matches…" : "Run matching again"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDrawer(true)}>
                Update case
              </Button>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Matching is run when the case is submitted. Contact CareMatch if you need a
              new run.
            </p>
          )}
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No specialists match this filter. Try &quot;All&quot; or another care
          mode.
        </p>
      ) : (
        <div className="space-y-6">
          {visible.map((m) => {
            const open = expanded === m.specialist_id;
            const primarySub =
              m.sub_specialties && m.sub_specialties.length > 0
                ? m.sub_specialties[0]
                : "—";
            const scoreRounded =
              m.match_score != null ? Math.round(Number(m.match_score)) : null;
            const flyRow = getModeRow(m.care_modes, "fly_doctor");

            return (
              <Card key={m.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Collapsed header row */}
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-stretch sm:gap-6">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary"
                      aria-hidden
                    >
                      {initialsFromName(m.full_name)}
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-lg font-semibold leading-tight">
                          {m.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {m.title ?? "Specialist"}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium text-foreground">
                          {m.specialty
                            ? m.specialty.charAt(0).toUpperCase() +
                              m.specialty.slice(1)
                            : "Specialty"}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {primarySub}
                        </span>
                      </p>
                      <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        <span>{m.institution ?? "—"}</span>
                        {m.country ? (
                          <>
                            <span className="text-muted-foreground/60">·</span>
                            <span aria-hidden>{countryFlagEmoji(m.country)}</span>
                            <span>{m.country}</span>
                          </>
                        ) : null}
                      </p>
                      <div className="flex flex-wrap gap-4 pt-1">
                        {CARE_MODE_KEYS.map((k) => {
                          const row = getModeRow(m.care_modes, k);
                          const tone = modeIconTone(row?.available, !!row);
                          return (
                            <div
                              key={k}
                              className={cn("flex items-center gap-1.5", toneClass[tone])}
                              title={
                                row?.detail
                                  ? row.detail
                                  : row
                                    ? (row.available ?? "—")
                                    : "No data"
                              }
                            >
                              <ModeGlyph mode={k} />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                      {m.rank_position === 1 && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          #1 Global
                        </span>
                      )}
                      {isAvailabilityMismatch(data.case.urgency, m.score_avail) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                          ⚠ Availability
                        </span>
                      )}
                      <div className="text-left sm:text-right">
                        <p className="text-4xl font-bold tabular-nums leading-none text-primary">
                          {scoreRounded ?? "—"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          clinical match
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t px-4 pb-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setExpanded(open ? null : m.specialist_id)
                      }
                    >
                      {open ? (
                        <>
                          <ChevronUp className="mr-2 h-4 w-4" />
                          Collapse
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-2 h-4 w-4" />
                          View full profile
                        </>
                      )}
                    </Button>
                  </div>

                  {open && (
                    <div className="space-y-8 border-t bg-muted/20 px-4 py-6 text-sm">
                      {/* SECTION A — Care delivery matrix */}
                      <section>
                        <h3 className="text-base font-semibold">
                          Care delivery — constraints are on the doctor and hospital,
                          not the patient
                        </h3>
                        <div className="mt-4 overflow-x-auto rounded-lg border bg-background">
                          <table className="w-full min-w-[640px] text-left text-sm">
                            <thead>
                              <tr className="border-b bg-muted/40">
                                <th className="p-3 font-medium">Mode</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Detail</th>
                                <th className="p-3 font-medium">Fee</th>
                                <th className="p-3 font-medium">Wait</th>
                                <th className="p-3 font-medium"> </th>
                              </tr>
                            </thead>
                            <tbody>
                              {CARE_MODE_KEYS.map((k) => {
                                const row = getModeRow(m.care_modes, k);
                                return (
                                  <tr key={k} className="border-b last:border-0">
                                    <td className="p-3 align-top font-medium">
                                      {MATRIX_MODE_LABEL[k] ?? k}
                                    </td>
                                    <td className="p-3 align-top">
                                      {row
                                        ? statusBadge(row.available)
                                        : (
                                            <span className="text-muted-foreground">
                                              No data
                                            </span>
                                          )}
                                    </td>
                                    <td className="p-3 align-top text-muted-foreground">
                                      {row?.detail ?? "—"}
                                    </td>
                                    <td className="p-3 align-top tabular-nums">
                                      {row?.fee_range ?? "—"}
                                    </td>
                                    <td className="p-3 align-top tabular-nums">
                                      {row?.wait_days != null
                                        ? `${row.wait_days} days`
                                        : "—"}
                                    </td>
                                    <td className="p-3 align-top">
                                      {variant === "patient" ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setConnectSpecialist(m)}
                                        >
                                          Enquire
                                        </Button>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </section>

                      {/* SECTION B — Fly the doctor (no country history list; hospitals are in section C) */}
                      <section className="space-y-3">
                        {m.willing_to_travel ? (
                          <>
                            <h3 className="text-base font-semibold">
                              This specialist is open to travelling
                            </h3>
                            {m.travel_note ? (
                              <p className="text-muted-foreground">{m.travel_note}</p>
                            ) : null}
                            <p className="font-semibold text-foreground">
                              Any country is possible — the only requirement is that the
                              receiving hospital completes a credentialing process for
                              this specialist.
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="text-base font-semibold">
                              Not available for international travel
                            </h3>
                            <p className="text-muted-foreground">
                              {flyRow?.detail?.trim()
                                ? flyRow.detail
                                : "No additional detail provided."}
                            </p>
                          </>
                        )}
                      </section>

                      {/* SECTION C — Hospital privileges */}
                      <section>
                        <h3 className="mb-3 text-base font-semibold">
                          Verified hospital and clinic privileges
                        </h3>
                        {m.hospital_privileges.length === 0 ? (
                          <p className="text-muted-foreground">None listed yet.</p>
                        ) : (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {m.hospital_privileges.map((h) => (
                              <div
                                key={h.id}
                                className="rounded-lg border bg-background p-4"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="text-lg" aria-hidden>
                                    {countryFlagEmoji(h.country)}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium leading-snug">
                                      {h.institution_name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {[h.city, h.country].filter(Boolean).join(", ")}
                                    </p>
                                  </div>
                                </div>
                                {h.privilege_type ? (
                                  <span className="mt-2 inline-block rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                                    {formatPrivilegeType(h.privilege_type)}
                                  </span>
                                ) : null}
                                {h.procedures && h.procedures.length > 0 ? (
                                  <ul className="mt-2 list-inside list-disc text-xs text-muted-foreground">
                                    {h.procedures.map((pr) => (
                                      <li key={pr}>{pr}</li>
                                    ))}
                                  </ul>
                                ) : null}
                                {h.capacity_pct != null ? (
                                  <div className="mt-3">
                                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                                      <span>Capacity</span>
                                      <span>{h.capacity_pct}%</span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                      <div
                                        className="h-full rounded-full bg-primary transition-all"
                                        style={{
                                          width: `${Math.min(100, Math.max(0, h.capacity_pct))}%`,
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* SECTION D — Compatibility */}
                      <section>
                        <h3 className="mb-3 text-base font-semibold">
                          Compatibility breakdown
                        </h3>
                        <div className="space-y-4">
                          {COMPAT_DIMS.map((dim) => {
                            const raw = m[dim.key];
                            const num =
                              raw != null && !Number.isNaN(Number(raw))
                                ? Number(raw)
                                : null;
                            const pct =
                              num != null
                                ? Math.min(100, Math.max(0, (num / dim.max) * 100))
                                : 0;
                            const availWarn =
                              dim.key === "score_avail" &&
                              isAvailabilityMismatch(data.case.urgency, m.score_avail);
                            return (
                              <div key={dim.key}>
                                <div className="mb-1 flex justify-between text-xs">
                                  <span className={cn("font-medium", availWarn && "text-amber-700 dark:text-amber-400")}>
                                    {dim.label}
                                    {availWarn && " ⚠"}
                                  </span>
                                  <span className="tabular-nums text-muted-foreground">
                                    {num != null ? num.toFixed(0) : "—"} / {dim.max}
                                  </span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      availWarn ? "bg-amber-400" : "bg-primary/90",
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                {availWarn && (
                                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400">
                                    This specialist&apos;s typical wait time may not meet your stated urgency. They are still a strong clinical match — contact them to discuss expedited availability.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* SECTION E — Connect */}
                      {variant === "patient" ? (
                        <section>
                          <Button
                            type="button"
                            size="lg"
                            className="w-full sm:w-auto"
                            onClick={() => setConnectSpecialist(m)}
                          >
                            Connect with {lastName(m.full_name)}
                          </Button>
                        </section>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {variant === "patient" && connectSpecialist ? (
        <ConnectionModal
          open
          caseId={caseId}
          specialist={{
            specialist_id: connectSpecialist.specialist_id,
            full_name: connectSpecialist.full_name,
            title: connectSpecialist.title,
            institution: connectSpecialist.institution,
            match_score: connectSpecialist.match_score,
            care_modes: connectSpecialist.care_modes,
          }}
          onClose={() => setConnectSpecialist(null)}
          onSuccess={() => setConnectSpecialist(null)}
        />
      ) : null}

      {variant === "patient" && drawer ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
          <button
            type="button"
            className="min-h-0 flex-1 cursor-default bg-transparent"
            aria-label="Close"
            onClick={() => setDrawer(false)}
          />
          <div className="h-full w-full max-w-md overflow-y-auto border-l bg-background p-6 shadow-xl">
            <h3 className="text-lg font-semibold">Update case</h3>
            <form
              className="mt-4 space-y-4"
              onSubmit={form.handleSubmit(onSaveCase)}
            >
              <div className="space-y-2">
                <Label htmlFor="condition_summary">Condition summary</Label>
                <Textarea
                  id="condition_summary"
                  rows={6}
                  {...form.register("condition_summary")}
                />
              </div>
              <div className="space-y-2">
                <Label>Urgency</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...form.register("urgency")}
                >
                  <option value="routine">Routine (within a few months)</option>
                  <option value="within_4_weeks">Within 4 weeks</option>
                  <option value="within_1_week">Within 1 week (urgent)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional notes</Label>
                <Textarea
                  id="additional_notes"
                  rows={3}
                  {...form.register("additional_notes")}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDrawer(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
