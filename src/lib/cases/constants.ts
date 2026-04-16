export const CASE_SPECIALTIES = [
  { id: "cardiology" as const, label: "Cardiology" },
  { id: "oncology" as const, label: "Oncology" },
  { id: "orthopaedics" as const, label: "Orthopaedics & MSK" },
];

export const DURATION_OPTIONS = [
  { value: "lt_1m", label: "Less than 1 month" },
  { value: "m1_6", label: "1–6 months" },
  { value: "m6_12", label: "6–12 months" },
  { value: "y1_2", label: "1–2 years" },
  { value: "gt_2", label: "More than 2 years" },
] as const;

export function durationToMonths(key: (typeof DURATION_OPTIONS)[number]["value"]): number {
  switch (key) {
    case "lt_1m":
      return 0;
    case "m1_6":
      return 4;
    case "m6_12":
      return 9;
    case "y1_2":
      return 18;
    case "gt_2":
      return 36;
    default:
      return 0;
  }
}

export const URGENCY_OPTIONS = [
  {
    value: "routine" as const,
    label: "Routine (within a few months)",
  },
  {
    value: "within_4_weeks" as const,
    label: "Within 4 weeks",
  },
  {
    value: "within_1_week" as const,
    label: "Within 1 week (urgent)",
  },
];

export const DIAGNOSIS_OPTIONS = [
  { value: "confirmed" as const, label: "Confirmed diagnosis" },
  { value: "suspected" as const, label: "Suspected — not yet confirmed" },
  { value: "unknown" as const, label: "No diagnosis yet" },
];

export const AGE_GROUP_OPTIONS = [
  { value: "infant" as const, label: "Infant" },
  { value: "child" as const, label: "Child" },
  { value: "teen" as const, label: "Teen" },
  { value: "adult" as const, label: "Adult" },
  { value: "senior" as const, label: "Senior" },
  { value: "elder" as const, label: "Elder" },
] as const;

export const INVESTIGATION_OPTIONS: { id: string; label: string }[] = [
  { id: "blood_tests", label: "Blood tests" },
  { id: "ecg", label: "ECG" },
  { id: "echocardiogram", label: "Echocardiogram" },
  { id: "xray", label: "X-ray" },
  { id: "ct", label: "CT scan" },
  { id: "mri", label: "MRI" },
  { id: "pet", label: "PET scan" },
  { id: "biopsy", label: "Biopsy" },
  { id: "genetic", label: "Genetic testing" },
  { id: "none", label: "None yet" },
  { id: "other", label: "Other" },
];
