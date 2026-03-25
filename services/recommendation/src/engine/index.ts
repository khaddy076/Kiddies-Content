import { eq, and, gte } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@kiddies/db';
import {
  users, childProfiles, parentProfiles, approvedContent, recommendations,
} from '@kiddies/db';
import { findSimilarParents, type ParentVector } from './similarity.js';
import { scoreContentForChild, applyFilters } from './scorer.js';
import dayjs from 'dayjs';

type DrizzleDb = PostgresJsDatabase<typeof schema>;

export interface RecommendationConfig {
  topN: number;
  communityMinParents: number;
  coldStartThreshold: number;
  safetyThreshold: number;
}

export async function generateRecommendations(
  childId: string,
  database: DrizzleDb,
  config: RecommendationConfig,
): Promise<void> {
  // 1. Load child profile
  const [childProfile] = await database
    .select({
      ageGroup: childProfiles.ageGroup,
      parentId: childProfiles.parentId,
    })
    .from(childProfiles)
    .where(eq(childProfiles.userId, childId));

  if (!childProfile) {
    console.warn(`[Recommendation] Child profile not found: ${childId}`);
    return;
  }

  // 2. Load parent profile
  const [parentProfile] = await database
    .select({
      religion: parentProfiles.religion,
      incomeBracket: parentProfiles.incomeBracket,
      countryCode: parentProfiles.countryCode,
      region: parentProfiles.region,
      languagePreference: parentProfiles.languagePreference,
    })
    .from(parentProfiles)
    .where(eq(parentProfiles.userId, childProfile.parentId));

  // 3. Check cold start (how many approvals has this parent made?)
  const [{ total: approvalCount }] = await database
    .select({ total: approvedContent.id })
    .from(approvedContent)
    .where(eq(approvedContent.approvedBy, childProfile.parentId));

  const targetVector: ParentVector = {
    userId: childProfile.parentId,
    religionBucket: parentProfile?.religion ?? null,
    incomeBucket: parentProfile?.incomeBracket ?? null,
    ageGroups: [childProfile.ageGroup ?? 'early-school'],
    region: parentProfile?.region ?? null,
    countryCode: parentProfile?.countryCode ?? null,
    language: parentProfile?.languagePreference ?? 'en',
  };

  let similarParents: Array<{ userId: string; similarity: number }> = [];

  const isColdStart = (typeof approvalCount === 'string' ? parseInt(approvalCount) : (approvalCount ?? 0)) < config.coldStartThreshold;

  if (!isColdStart) {
    // 4. Load all other parent vectors
    const allParents = await database.select({
      userId: parentProfiles.userId,
      religion: parentProfiles.religion,
      incomeBracket: parentProfiles.incomeBracket,
      countryCode: parentProfiles.countryCode,
      region: parentProfiles.region,
      languagePreference: parentProfiles.languagePreference,
    }).from(parentProfiles);

    const candidateVectors: ParentVector[] = allParents.map((p) => ({
      userId: p.userId,
      religionBucket: p.religion,
      incomeBucket: p.incomeBracket,
      ageGroups: [],
      region: p.region,
      countryCode: p.countryCode,
      language: p.languagePreference ?? 'en',
    }));

    similarParents = findSimilarParents(targetVector, candidateVectors, 200);

    // Only use if we have enough community data
    if (similarParents.length < config.communityMinParents) {
      similarParents = similarParents.slice(0, similarParents.length);
    }
  }

  // 5. Score content
  const scores = await scoreContentForChild(
    childId,
    childProfile.ageGroup ?? 'early-school',
    similarParents,
    config.safetyThreshold,
    database,
  );

  // 6. Filter
  const filtered = await applyFilters(scores, childId, config.safetyThreshold, database);

  // 7. Take top N
  const topScores = filtered.slice(0, config.topN);

  if (topScores.length === 0) {
    console.log(`[Recommendation] No recommendations generated for child ${childId} (cold start or empty catalog)`);
    return;
  }

  // 8. Upsert recommendations
  const expiresAt = dayjs().add(24, 'hours').toDate();

  // Delete old recommendations
  await database.delete(recommendations).where(eq(recommendations.childId, childId));

  // Insert new ones
  await database.insert(recommendations).values(
    topScores.map((score) => ({
      childId,
      contentId: score.contentId,
      score: score.score,
      reasonCode: score.reasonCode as 'community_similar_parents' | 'trending_age_group' | 'parent_channel_preference' | 'category_preference' | 'global_trending',
      reasonLabel: score.reasonLabel,
      expiresAt,
      shownToChild: false,
    })),
  );

  console.log(`[Recommendation] Generated ${topScores.length} recommendations for child ${childId}`);
}
