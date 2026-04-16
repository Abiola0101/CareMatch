/**
 * Mirrors keyword ↔ sub-specialty overlap logic from
 * `supabase/functions/match-specialists/index.ts` for analytics only.
 */

function normToken(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

export function extractKeywords(conditionSummary: string | null): string[] {
  if (!conditionSummary?.trim()) return [];
  const parts = conditionSummary
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_/]/g, " ")
    .split(/[\s\-_/]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2);
  return Array.from(new Set(parts.map(normToken).filter(Boolean)));
}

function tagParts(tag: string): string[] {
  return tag
    .toLowerCase()
    .split(/[\s,\-/&]+/)
    .map(normToken)
    .filter((p) => p.length > 2);
}

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
    let hit = false;
    kb.forEach((id) => {
      if (tagBucketUnion.has(id)) hit = true;
    });
    if (hit) return true;
  }
  return false;
}

/** True if this sub-specialty tag aligns with the case narrative (same rules as matching). */
export function subSpecialtyOverlapsCase(
  tag: string,
  conditionSummary: string | null,
): boolean {
  const keywords = extractKeywords(conditionSummary);
  if (keywords.length === 0) return false;
  return exactKeywordTagMatch(keywords, tag) || relatedKeywordTagMatch(keywords, tag);
}
