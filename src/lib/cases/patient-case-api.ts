import { z } from "zod";

const specialtyEnum = z.enum(["cardiology", "oncology", "orthopaedics"]);

/** POST `api/patient/cases` and PUT `api/patient/cases/[id]` body validation. */
export const patientCaseWriteSchema = z.object({
  specialties: z.array(specialtyEnum).min(1).max(3),
  condition_summary: z
    .string()
    .min(50, "Please write at least 50 characters so we can match you properly."),
  duration: z.enum(["lt_1m", "m1_6", "m6_12", "y1_2", "gt_2"]),
  urgency: z.enum(["routine", "within_4_weeks", "within_1_week"]),
  diagnosis_status: z.enum(["confirmed", "suspected", "unknown"]),
  treatments_tried: z.string().max(20000).nullable().optional(),
  additional_notes: z.string().max(20000).nullable().optional(),
  investigations: z.array(z.string()).max(40),
});

export function titleForSpecialty(spec: string, when: string) {
  const m: Record<string, string> = {
    cardiology: "Cardiology case",
    oncology: "Oncology case",
    orthopaedics: "Orthopaedics case",
  };
  return `${m[spec] ?? "Care case"} — ${when}`;
}
