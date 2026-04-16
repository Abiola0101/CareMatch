import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-match-internal",
};

function normalizeEnvSecret(s: string | undefined | null): string {
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

type CaseRow = {
  id: string;
  patient_id?: string;
  specialty: string;
  condition_summary: string | null;
  urgency: string;
  age_group: string | null;
  investigations_done: string[] | null;
  diagnosis_status: string | null;
};

type SpecialistRow = {
  id: string;
  specialty: string;
  sub_specialties: string[] | null;
  case_volume_annual: number | null;
  avg_clinic_wait_days: number | null;
  verified: boolean;
  is_accepting: boolean;
};

/** Normalized token for comparison (lowercase alphanumerics). */
function normToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

/** Words / tokens from free text for clinical matching. */
function extractKeywords(conditionSummary: string | null): string[] {
  if (!conditionSummary?.trim()) return [];
  const parts = conditionSummary
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_/]/g, " ")
    .split(/[\s\-_/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
  return [...new Set(parts.map(normToken).filter(Boolean))];
}

/** Split a sub-specialty tag into comparable parts. */
function tagParts(tag: string): string[] {
  return tag
    .toLowerCase()
    .split(/[\s,\-/&]+/)
    .map(normToken)
    .filter((p) => p.length > 2);
}

/**
 * Synonym / related-term buckets: terms in the same bucket are "related"
 * for clinical fit (not exact tag match).
 */
const RELATED_BUCKETS: string[][] = [
  ["interventional", "pci", "stent", "angioplasty", "coronary", "catheter"],
  ["electrophysiology", "arrhythmia", "ablation", "afib", "flutter"],
  ["heart", "cardiac", "cardiology", "cardiovascular"],
  ["failure", "hf", "cardiomyopathy", "hfr"],
  ["oncology", "cancer", "tumor", "tumour", "malignancy", "chemo", "chemotherapy"],
  ["radiation", "radiotherapy", "radiology"],
  ["hematology", "haematology", "hematologic", "lymphoma", "leukemia", "leukaemia"],
  ["orthopaedic", "orthopedic", "orthopaedics", "msk", "musculoskeletal"],
  ["spine", "spinal", "scoliosis", "disc"],
  ["hip", "knee", "shoulder", "joint", "arthroplasty", "replacement"],
  ["sports", "trauma", "fracture", "injury"],
  ["hand", "wrist", "foot", "ankle"],
  ["imaging", "echo", "echocardiogram", "mri", "ct", "pet"],
  ["structural", "valve", "tavr", "surgery"],
];

function bucketIdsForTerm(term: string): Set<number> {
  const n = normToken(term);
  const out = new Set<number>();
  RELATED_BUCKETS.forEach((bucket, i) => {
    for (const b of bucket) {
      if (normToken(b) === n || n.includes(normToken(b)) || normToken(b).includes(n)) {
        out.add(i);
        return;
      }
    }
  });
  return out;
}

function exactKeywordTagMatch(keywords: string[], tag: string): boolean {
  const tNorm = normToken(tag);
  const parts = tagParts(tag);
  for (const kw of keywords) {
    if (!kw) continue;
    if (tNorm && (kw === tNorm || tNorm.includes(kw) || kw.includes(tNorm))) {
      if (kw.length >= 4 || tNorm.length >= 4) return true;
    }
    for (const p of parts) {
      if (kw === p || (kw.length >= 4 && (p.includes(kw) || kw.includes(p)))) {
        return true;
      }
    }
  }
  return false;
}

function relatedKeywordTagMatch(keywords: string[], tag: string): boolean {
  const tagBucketUnion = new Set<number>();
  bucketIdsForTerm(tag).forEach((id) => tagBucketUnion.add(id));
  for (const p of tagParts(tag)) {
    bucketIdsForTerm(p).forEach((id) => tagBucketUnion.add(id));
  }

  for (const kw of keywords) {
    const kb = bucketIdsForTerm(kw);
    for (const id of kb) {
      if (tagBucketUnion.has(id)) return true;
    }
  }
  return false;
}

/** Clinical fit — 30 max: exact tag 30, related 20, general same specialty 10 */
function scoreClinicalFit(keywords: string[], tags: string[]): number {
  const safeTags = (tags ?? []).filter(Boolean);
  if (safeTags.length === 0) return 10;

  for (const tag of safeTags) {
    if (exactKeywordTagMatch(keywords, tag)) return 30;
  }
  for (const tag of safeTags) {
    if (relatedKeywordTagMatch(keywords, tag)) return 20;
  }
  return 10;
}

/** Sub-specialty depth — 25 max from count of matching tags */
function scoreSubspecDepth(keywords: string[], tags: string[]): number {
  const safeTags = (tags ?? []).filter(Boolean);
  let matchCount = 0;
  for (const tag of safeTags) {
    if (exactKeywordTagMatch(keywords, tag)) {
      matchCount++;
      continue;
    }
    if (relatedKeywordTagMatch(keywords, tag)) matchCount++;
  }
  if (matchCount >= 3) return 25;
  if (matchCount === 2) return 18;
  if (matchCount === 1) return 10;
  return 0;
}

function scoreCaseVolume(vol: number | null): number {
  if (vol === null || vol === undefined) return 4;
  if (vol >= 200) return 20;
  if (vol >= 100) return 16;
  if (vol >= 50) return 12;
  if (vol >= 20) return 8;
  return 4;
}

function scoreAvailability(
  urgency: string,
  wait: number | null,
): number {
  if (wait === null || wait === undefined) return 8;
  const w = wait;
  switch (urgency) {
    case "within_1_week":
      if (w <= 7) return 15;
      if (w <= 14) return 10;
      if (w <= 30) return 5;
      return 2;
    case "within_4_weeks":
      if (w <= 14) return 15;
      if (w <= 30) return 12;
      if (w <= 60) return 8;
      return 4;
    case "routine":
    default:
      if (w <= 30) return 15;
      if (w <= 60) return 12;
      if (w <= 90) return 9;
      return 6;
  }
}

/**
 * Outcomes — 10 max for CareMatch-verified profiles; lower cap for
 * specialists still pending verification so they can appear in dev/staging
 * and rank below verified peers.
 */
function scoreOutcomes(
  profileVerified: boolean,
  caseVolumeAnnual: number | null,
): number {
  const v = caseVolumeAnnual ?? 0;
  if (!profileVerified) {
    return v > 100 ? 5 : 3;
  }
  return v > 100 ? 10 : 8;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * True if Bearer is this project's service-role JWT.
 * Supports legacy HS256 (SUPABASE_JWT_SECRET) and newer asymmetric keys (JWKS).
 */
async function isServiceRoleJwt(
  bearer: string,
  supabaseUrl: string,
  jwtSecret: string | undefined,
): Promise<boolean> {
  if (jwtSecret) {
    try {
      const { payload } = await jwtVerify(
        bearer,
        new TextEncoder().encode(jwtSecret),
        { algorithms: ["HS256"] },
      );
      if (payload.role === "service_role") return true;
    } catch {
      /* try JWKS */
    }
  }

  try {
    const base = supabaseUrl.replace(/\/$/, "");
    const jwks = createRemoteJWKSet(
      new URL(`${base}/auth/v1/.well-known/jwks.json`),
    );
    const { payload } = await jwtVerify(bearer, jwks, {
      algorithms: ["ES256", "RS256"],
    });
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = normalizeEnvSecret(Deno.env.get("SUPABASE_URL"));
  const supabaseAnon = normalizeEnvSecret(Deno.env.get("SUPABASE_ANON_KEY"));
  const serviceKey = normalizeEnvSecret(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  const jwtSecret = normalizeEnvSecret(Deno.env.get("SUPABASE_JWT_SECRET")) ||
    undefined;
  const internalSecret = normalizeEnvSecret(Deno.env.get("MATCH_INTERNAL_SECRET")) ||
    undefined;

  if (!supabaseUrl || !supabaseAnon || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!bearer) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const internalHeader = normalizeEnvSecret(req.headers.get("x-match-internal"));
  const internalOk = Boolean(
    internalSecret &&
      internalHeader &&
      internalHeader === internalSecret,
  );

  const keyOk = Boolean(serviceKey && bearer === serviceKey);
  const jwtOk = await isServiceRoleJwt(bearer, supabaseUrl, jwtSecret);

  if (!keyOk && !jwtOk && !internalOk) {
    console.warn(
      "[match-specialists] rejected caller (not service role key, JWT, or internal secret)",
    );
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  let body: { case_id?: string; insurer_case_id?: string; user_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const patientCaseId = body.case_id?.trim();
  const insurerCaseId = body.insurer_case_id?.trim();
  if (!patientCaseId && !insurerCaseId) {
    return jsonResponse(
      { error: "case_id or insurer_case_id is required" },
      400,
    );
  }

  const userId = body.user_id?.trim();
  if (!userId) {
    return jsonResponse({ error: "user_id is required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    },
  });

  let c: CaseRow;
  let matchKind: "patient" | "insurer";
  let persistCaseId: string;

  if (insurerCaseId) {
    matchKind = "insurer";
    persistCaseId = insurerCaseId;
    const { data: insRow, error: insErr } = await admin
      .from("insurer_cases")
      .select(
        "id, insurer_id, specialty, condition_summary, urgency, age_group, investigations_done",
      )
      .eq("id", insurerCaseId)
      .eq("insurer_id", userId)
      .maybeSingle();

    if (insErr) {
      console.error("[match-specialists] insurer case fetch", insErr);
      return jsonResponse({ error: "Could not load case" }, 500);
    }

    if (!insRow) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

    const urg = (insRow.urgency as string | null) ?? "routine";
    c = {
      id: insRow.id,
      specialty: insRow.specialty as string,
      condition_summary: insRow.condition_summary,
      urgency: urg,
      age_group: insRow.age_group,
      investigations_done: insRow.investigations_done,
      diagnosis_status: null,
    };
  } else {
    matchKind = "patient";
    persistCaseId = patientCaseId!;
    const { data: caseRow, error: caseErr } = await admin
      .from("patient_cases")
      .select(
        "id, patient_id, specialty, condition_summary, urgency, age_group, investigations_done, diagnosis_status",
      )
      .eq("id", patientCaseId)
      .eq("patient_id", userId)
      .maybeSingle();

    if (caseErr) {
      console.error("[match-specialists] case fetch", caseErr);
      return jsonResponse({ error: "Could not load case" }, 500);
    }

    if (!caseRow) {
      return jsonResponse({ error: "Case not found" }, 404);
    }

    c = caseRow as CaseRow;
  }

  // Accepting specialists only. `verified` defaults false in DB — excluding
  // unverified profiles hid every match until ops marks them verified.
  const { data: specialists, error: specErr } = await admin
    .from("specialist_profiles")
    .select(
      "id, specialty, sub_specialties, case_volume_annual, avg_clinic_wait_days, verified, is_accepting",
    )
    .eq("specialty", c.specialty)
    .eq("is_accepting", true);

  if (specErr) {
    console.error("[match-specialists] specialists fetch", specErr);
    return jsonResponse({ error: "Could not load specialists" }, 500);
  }

  const candidates = (specialists ?? []) as SpecialistRow[];

  if (candidates.length === 0) {
    if (matchKind === "patient") {
      await admin.from("match_results").delete().eq("case_id", persistCaseId);
    } else {
      await admin.from("insurer_match_results").delete().eq(
        "insurer_case_id",
        persistCaseId,
      );
      await admin.from("insurer_cases").update({ status: "matched" }).eq(
        "id",
        persistCaseId,
      );
    }
    return jsonResponse({ success: true, count: 0 });
  }

  const keywords = extractKeywords(c.condition_summary);

  const scored = candidates.map((s) => {
    const tags = s.sub_specialties ?? [];
    const clinical = scoreClinicalFit(keywords, tags);
    const subspec = scoreSubspecDepth(keywords, tags);
    const volume = scoreCaseVolume(s.case_volume_annual);
    const avail = scoreAvailability(c.urgency, s.avg_clinic_wait_days);
    const outcomes = scoreOutcomes(s.verified, s.case_volume_annual);

    const total =
      clinical + subspec + volume + avail + outcomes;

    return {
      specialist_id: s.id,
      match_score: Math.round(total * 100) / 100,
      score_clinical: clinical,
      score_subspec: subspec,
      score_volume: volume,
      score_avail: avail,
      score_outcomes: outcomes,
    };
  });

  const THRESHOLD = 40;
  const sortedAll = [...scored].sort((a, b) => b.match_score - a.match_score);
  const ranked = sortedAll
    .filter((r) => r.match_score >= THRESHOLD)
    .slice(0, 10);

  const delTable = matchKind === "patient"
    ? "match_results"
    : "insurer_match_results";
  const delCol = matchKind === "patient" ? "case_id" : "insurer_case_id";

  const { error: delErr } = await admin.from(delTable).delete().eq(
    delCol,
    persistCaseId,
  );

  if (delErr) {
    console.error("[match-specialists] delete", delErr);
    return jsonResponse({ error: "Could not reset matches" }, 500);
  }

  if (ranked.length === 0) {
    if (matchKind === "insurer") {
      await admin.from("insurer_cases").update({ status: "matched" }).eq(
        "id",
        persistCaseId,
      );
    }
    return jsonResponse({ success: true, count: 0 });
  }

  const timeIso = new Date().toISOString();

  const rowsPatient = ranked.map((r, idx) => ({
    case_id: persistCaseId,
    specialist_id: r.specialist_id,
    match_score: r.match_score,
    score_clinical: r.score_clinical,
    score_subspec: r.score_subspec,
    score_volume: r.score_volume,
    score_outcomes: r.score_outcomes,
    score_avail: r.score_avail,
    rank_position: idx + 1,
    computed_at: timeIso,
  }));

  const rowsInsurer = ranked.map((r, idx) => ({
    insurer_case_id: persistCaseId,
    specialist_id: r.specialist_id,
    match_score: r.match_score,
    score_clinical: r.score_clinical,
    score_subspec: r.score_subspec,
    score_volume: r.score_volume,
    score_outcomes: r.score_outcomes,
    score_avail: r.score_avail,
    rank_position: idx + 1,
    computed_at: timeIso,
  }));

  const insertPayload = matchKind === "patient" ? rowsPatient : rowsInsurer;
  const insertTable = matchKind === "patient"
    ? "match_results"
    : "insurer_match_results";

  const { data: insertedRows, error: insErr } = await admin
    .from(insertTable)
    .insert(insertPayload)
    .select("id");

  if (insErr) {
    console.error(
      "[match-specialists] insert",
      insErr.message,
      insErr.details,
      insErr.hint,
      insErr.code,
    );
    return jsonResponse(
      {
        error: "Could not save matches",
        detail: insErr.message,
      },
      500,
    );
  }

  const saved = insertedRows?.length ?? 0;
  if (saved !== insertPayload.length) {
    console.error(
      "[match-specialists] insert count mismatch",
      "expected",
      insertPayload.length,
      "got",
      saved,
    );
  }

  if (matchKind === "insurer") {
    const { error: upErr } = await admin.from("insurer_cases").update({
      status: "matched",
    }).eq("id", persistCaseId);
    if (upErr) {
      console.error("[match-specialists] insurer case status", upErr);
    }
  }

  return jsonResponse({ success: true, count: ranked.length });
});
