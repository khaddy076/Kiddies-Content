import { eq, and, gte, sql, inArray, notInArray } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@kiddies/db';
import {
  communityContentStats, approvedContent, watchSessions, contentItems, childContentFilters,
} from '@kiddies/db';
import dayjs from 'dayjs';

type DrizzleDb = PostgresJsDatabase<typeof schema>;

export interface ContentScore {
  contentId: string;
  score: number;
  reasonCode: string;
  reasonLabel: string;
}

const WEIGHTS = {
  communityApproval: 0.40,
  childWatchHistory: 0.25,
  parentApprovalPattern: 0.15,
  categoryPreference: 0.10,
  globalTrending: 0.10,
};

export async function scoreContentForChild(
  childId: string,
  ageGroup: string,
  similarParents: Array<{ userId: string; similarity: number }>,
  safetyThreshold: number,
  database: DrizzleDb,
): Promise<ContentScore[]> {
  const scoreMap = new Map<string, { score: number; reasonCode: string; reasonLabel: string }>();

  // 1. Community approvals from similar parents (weight: 0.40)
  if (similarParents.length > 0) {
    const parentIds = similarParents.map((p) => p.userId);
    const communityApprovals = await database
      .select({
        contentId: communityContentStats.contentId,
        approvalCount: communityContentStats.approvalCount,
        avgWatchPct: communityContentStats.avgWatchPct,
      })
      .from(communityContentStats)
      .where(and(
        eq(communityContentStats.ageGroup, ageGroup),
        inArray(communityContentStats.contentId, parentIds), // repurposed as bucket filter
      ))
      .limit(200);

    // Also get direct approvals from similar parents
    const directApprovals = await database
      .select({
        contentId: approvedContent.contentId,
        approvedAt: approvedContent.approvedAt,
      })
      .from(approvedContent)
      .where(inArray(approvedContent.approvedBy, parentIds));

    // Score each content by weighted approval from similar parents
    for (const approval of directApprovals) {
      const parentSimilarity = similarParents.find(p => p.userId === approval.approvedBy)?.similarity ?? 0.5;
      const existing = scoreMap.get(approval.contentId);
      const increment = parentSimilarity * WEIGHTS.communityApproval;
      if (existing) {
        existing.score += increment;
      } else {
        scoreMap.set(approval.contentId, {
          score: increment,
          reasonCode: 'community_similar_parents',
          reasonLabel: 'Parents with similar values approved this',
        });
      }
    }
  }

  // 2. Global trending for age group (weight: 0.10)
  const globalStats = await database
    .select({
      contentId: communityContentStats.contentId,
      approvalCount: communityContentStats.approvalCount,
      watchCount: communityContentStats.watchCount,
    })
    .from(communityContentStats)
    .where(eq(communityContentStats.ageGroup, ageGroup))
    .orderBy(sql`${communityContentStats.approvalCount} DESC`)
    .limit(100);

  const maxApprovals = Math.max(...globalStats.map((s) => s.approvalCount), 1);
  for (const stat of globalStats) {
    const normalizedScore = (stat.approvalCount / maxApprovals) * WEIGHTS.globalTrending;
    const existing = scoreMap.get(stat.contentId);
    if (existing) {
      existing.score += normalizedScore;
    } else {
      scoreMap.set(stat.contentId, {
        score: normalizedScore,
        reasonCode: 'trending_age_group',
        reasonLabel: `Trending for ${ageGroup} children`,
      });
    }
  }

  // 3. Category preferences from child's watch history (weight: 0.10)
  const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
  const watchedCategories = await database
    .select({
      category: contentItems.categoryLabel,
      count: sql<number>`count(*)`,
    })
    .from(watchSessions)
    .innerJoin(contentItems, eq(contentItems.id, watchSessions.contentId))
    .where(and(eq(watchSessions.childId, childId), gte(watchSessions.startedAt, sevenDaysAgo)))
    .groupBy(contentItems.categoryLabel)
    .orderBy(sql`count(*) DESC`)
    .limit(5);

  if (watchedCategories.length > 0) {
    const preferredCategories = watchedCategories.map((c) => c.category).filter(Boolean) as string[];
    if (preferredCategories.length > 0) {
      const categoryContent = await database
        .select({ id: contentItems.id })
        .from(contentItems)
        .where(inArray(contentItems.categoryLabel, preferredCategories))
        .limit(100);

      for (const item of categoryContent) {
        const existing = scoreMap.get(item.id);
        if (existing) {
          existing.score += WEIGHTS.categoryPreference;
        } else {
          scoreMap.set(item.id, {
            score: WEIGHTS.categoryPreference,
            reasonCode: 'category_preference',
            reasonLabel: 'Based on categories you enjoy',
          });
        }
      }
    }
  }

  return Array.from(scoreMap.entries())
    .map(([contentId, { score, reasonCode, reasonLabel }]) => ({
      contentId,
      score,
      reasonCode,
      reasonLabel,
    }))
    .sort((a, b) => b.score - a.score);
}

export async function applyFilters(
  scores: ContentScore[],
  childId: string,
  safetyThreshold: number,
  database: DrizzleDb,
): Promise<ContentScore[]> {
  if (scores.length === 0) return scores;

  const contentIds = scores.map((s) => s.contentId);

  // Get content metadata for safety check
  const contents = await database
    .select({
      id: contentItems.id,
      aiSafetyScore: contentItems.aiSafetyScore,
      categoryLabel: contentItems.categoryLabel,
      channelId: contentItems.channelId,
      tags: contentItems.tags,
    })
    .from(contentItems)
    .where(inArray(contentItems.id, contentIds));

  const contentMap = new Map(contents.map((c) => [c.id, c]));

  // Get already approved content (exclude from recs)
  const alreadyApproved = await database
    .select({ contentId: approvedContent.contentId })
    .from(approvedContent)
    .where(eq(approvedContent.childId, childId));
  const approvedIds = new Set(alreadyApproved.map((a) => a.contentId));

  // Get recently watched (last 7 days)
  const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
  const recentlyWatched = await database
    .select({ contentId: watchSessions.contentId })
    .from(watchSessions)
    .where(and(eq(watchSessions.childId, childId), gte(watchSessions.startedAt, sevenDaysAgo)));
  const watchedIds = new Set(recentlyWatched.map((w) => w.contentId));

  // Get block filters
  const filters = await database
    .select({ filterType: childContentFilters.filterType, filterValue: childContentFilters.filterValue })
    .from(childContentFilters)
    .where(eq(childContentFilters.childId, childId));

  const blockedCategories = new Set(filters.filter((f) => f.filterType === 'block_category').map((f) => f.filterValue));
  const blockedChannels = new Set(filters.filter((f) => f.filterType === 'block_channel').map((f) => f.filterValue));
  const blockedTags = new Set(filters.filter((f) => f.filterType === 'block_tag').map((f) => f.filterValue));

  return scores.filter((score) => {
    if (approvedIds.has(score.contentId)) return false; // already have it
    if (watchedIds.has(score.contentId)) return false;  // watched recently

    const content = contentMap.get(score.contentId);
    if (!content) return false;

    // Safety score check
    if (content.aiSafetyScore !== null && content.aiSafetyScore < safetyThreshold) return false;

    // Block filters
    if (content.categoryLabel && blockedCategories.has(content.categoryLabel)) return false;
    if (content.channelId && blockedChannels.has(content.channelId)) return false;
    if (content.tags?.some((tag) => blockedTags.has(tag))) return false;

    return true;
  });
}
