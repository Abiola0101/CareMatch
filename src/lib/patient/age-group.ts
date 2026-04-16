/** Matches patient_profiles.age_group check constraint. */
export type PatientAgeGroup =
  | "infant"
  | "child"
  | "teen"
  | "adult"
  | "senior"
  | "elder";

/** Derive age group from DOB; returns null if DOB invalid. */
export function ageGroupFromDateOfBirth(dob: string): PatientAgeGroup | null {
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) {
    return null;
  }
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  if (age < 2) {
    return "infant";
  }
  if (age < 13) {
    return "child";
  }
  if (age < 18) {
    return "teen";
  }
  if (age < 60) {
    return "adult";
  }
  if (age < 75) {
    return "senior";
  }
  return "elder";
}
