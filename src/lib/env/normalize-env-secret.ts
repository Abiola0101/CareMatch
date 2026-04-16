/** Strip whitespace and optional matching quotes from .env values. */
export function normalizeEnvSecret(s: string | undefined | null): string {
  if (s == null) return "";
  let t = String(s).trim();
  if (t.length >= 2) {
    const q = t[0];
    if ((q === '"' || q === "'") && t.endsWith(q)) {
      t = t.slice(1, -1).trim();
    }
  }
  return t;
}
