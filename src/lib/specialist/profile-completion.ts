/** Count how many profile fields are filled (0–100) for specialist dashboard. */

type ProfileRow = {
  full_name?: string | null;
  phone?: string | null;
};

type SpecRow = {
  title?: string | null;
  specialty?: string | null;
  sub_specialties?: string[] | null;
  institution?: string | null;
  city?: string | null;
  country?: string | null;
  years_experience?: number | null;
  languages?: string[] | null;
  bio?: string | null;
  profile_video_url?: string | null;
  avg_clinic_wait_days?: number | null;
  avg_proc_wait_days?: number | null;
};

function filled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function specialistProfileCompletionPercent(
  profile: ProfileRow,
  spec: SpecRow,
): number {
  const keys: (keyof SpecRow)[] = [
    "title",
    "specialty",
    "sub_specialties",
    "institution",
    "city",
    "country",
    "years_experience",
    "languages",
    "bio",
    "avg_clinic_wait_days",
    "avg_proc_wait_days",
  ];
  const profileKeys: (keyof ProfileRow)[] = ["full_name", "phone"];

  let done = 0;
  let total = keys.length + profileKeys.length;
  for (const k of profileKeys) {
    if (filled(profile[k])) done++;
  }
  for (const k of keys) {
    if (filled(spec[k])) done++;
  }
  return Math.round((done / Math.max(1, total)) * 100);
}
