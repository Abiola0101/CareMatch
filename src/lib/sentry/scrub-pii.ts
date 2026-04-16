const SENSITIVE_KEYS = new Set([
  "email",
  "phone",
  "full_name",
  "condition_summary",
  "health_card_number",
  "message",
]);

function walk(obj: unknown): void {
  if (!obj || typeof obj !== "object") {
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      walk(item);
    }
    return;
  }
  const record = obj as Record<string, unknown>;
  for (const k of Object.keys(record)) {
    const v = record[k];
    if (SENSITIVE_KEYS.has(k)) {
      record[k] = "[Filtered]";
    } else if (v && typeof v === "object") {
      walk(v);
    }
  }
}

/** Minimal Sentry event shape for scrubbing (no `@sentry/core` import). */
type SentryLikeEvent = {
  user?: unknown;
  request?: { data?: unknown };
  extra?: unknown;
  contexts?: unknown;
  breadcrumbs?: Array<{ data?: unknown }>;
  exception?: {
    values?: Array<{
      stacktrace?: { frames?: Array<{ vars?: unknown }> };
    }>;
  };
};

export function scrubSentryEvent<T>(event: T): T | null {
  const e = event as SentryLikeEvent;
  try {
    if (e.user && typeof e.user === "object") {
      walk(e.user);
    }
    if (e.request?.data) {
      walk(e.request.data);
    }
    if (e.extra) {
      walk(e.extra);
    }
    if (e.contexts) {
      walk(e.contexts);
    }
    if (e.breadcrumbs) {
      for (const b of e.breadcrumbs) {
        if (b.data && typeof b.data === "object") {
          const d = b.data as Record<string, unknown>;
          for (const key of Object.keys(d)) {
            if (SENSITIVE_KEYS.has(key)) {
              d[key] = "[Filtered]";
            }
          }
        }
      }
    }
    if (e.exception?.values) {
      for (const ex of e.exception.values) {
        if (ex.stacktrace?.frames) {
          for (const fr of ex.stacktrace.frames) {
            if (fr.vars && typeof fr.vars === "object") {
              const vars = fr.vars as Record<string, unknown>;
              for (const key of Object.keys(vars)) {
                if (SENSITIVE_KEYS.has(key)) {
                  vars[key] = "[Filtered]";
                }
              }
            }
          }
        }
      }
    }
  } catch {
    /* never block send */
  }
  return event;
}
