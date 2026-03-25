export interface ParentVector {
  userId: string;
  religionBucket: string | null;
  incomeBucket: string | null;
  ageGroups: string[];
  region: string | null;
  countryCode: string | null;
  language: string;
}

/**
 * Compute similarity score (0.0 – 1.0) between two parent profiles.
 * Weights: religion 0.35, income 0.25, region/country 0.25, language 0.15
 */
export function computeParentSimilarity(a: ParentVector, b: ParentVector): number {
  let score = 0;

  // Religion match
  if (a.religionBucket && b.religionBucket) {
    score += a.religionBucket === b.religionBucket ? 0.35 : 0;
  } else if (!a.religionBucket && !b.religionBucket) {
    score += 0.175; // both unknown, partial credit
  }

  // Income bracket match
  if (a.incomeBucket && b.incomeBucket) {
    const brackets = ['lower', 'middle', 'upper-middle', 'upper'];
    const ai = brackets.indexOf(a.incomeBucket);
    const bi = brackets.indexOf(b.incomeBucket);
    const distance = Math.abs(ai - bi);
    score += distance === 0 ? 0.25 : distance === 1 ? 0.125 : 0;
  } else if (!a.incomeBucket && !b.incomeBucket) {
    score += 0.125;
  }

  // Region/country match
  if (a.countryCode && b.countryCode && a.countryCode === b.countryCode) {
    score += 0.25;
  } else if (a.region && b.region && a.region === b.region) {
    score += 0.125;
  } else if (!a.countryCode && !b.countryCode) {
    score += 0.0625;
  }

  // Language match
  if (a.language && b.language) {
    score += a.language === b.language ? 0.15 : 0;
  } else {
    score += 0.075;
  }

  return Math.min(score, 1.0);
}

/**
 * Find the top N most similar parents from a list of candidates.
 */
export function findSimilarParents(
  target: ParentVector,
  candidates: ParentVector[],
  topN: number,
): Array<{ userId: string; similarity: number }> {
  return candidates
    .filter((c) => c.userId !== target.userId)
    .map((c) => ({ userId: c.userId, similarity: computeParentSimilarity(target, c) }))
    .filter((c) => c.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}
