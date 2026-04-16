import { NextRequest, NextResponse } from "next/server";

type Bucket = { windowStart: number; count: number };

const globalForLimit = globalThis as unknown as {
  __carematchRateBuckets?: Map<string, Bucket>;
};

const store = globalForLimit.__carematchRateBuckets ?? new Map<string, Bucket>();
globalForLimit.__carematchRateBuckets = store;

const WINDOW_MS = 60_000;
const MAX_KEYS = 8000;

function prune(now: number) {
  if (store.size <= MAX_KEYS) {
    return;
  }
  for (const [k, v] of Array.from(store.entries())) {
    if (now - v.windowStart > WINDOW_MS * 2) {
      store.delete(k);
    }
  }
}

export function clientIp(request: NextRequest): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }
  return "unknown";
}

/**
 * Returns a 429 response if over limit, otherwise null. Fixed window per minute.
 */
export function rateLimitApiResponse(
  request: NextRequest,
  pathname: string,
  userId: string | null,
): NextResponse | null {
  if (pathname.startsWith("/api/webhooks/stripe")) {
    return null;
  }

  const now = Date.now();
  prune(now);

  const ip = clientIp(request);
  let key: string;
  let limit: number;

  if (pathname.startsWith("/api/auth/")) {
    key = `auth:${ip}`;
    limit = 10;
  } else if (userId) {
    key = `user:${userId}`;
    limit = 300;
  } else {
    key = `pub:${ip}`;
    limit = 100;
  }

  let b = store.get(key);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    b = { windowStart: now, count: 0 };
  }
  b.count += 1;
  store.set(key, b);

  if (b.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      },
    );
  }

  return null;
}
