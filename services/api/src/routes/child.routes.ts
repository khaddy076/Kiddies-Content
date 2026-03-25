import type { FastifyInstance } from 'fastify';
import { eq, and, desc, sql, or, isNull, gte } from 'drizzle-orm';
import { db } from '../db.js';
import {
  contentItems, approvedContent, contentRequests, watchSessions,
  recommendations, childProfiles, childContentFilters, users,
} from '@kiddies/db';
import { requireChild } from '../middleware/auth.ts';
import { notificationQueue } from '../queues/index.js';
import { YouTubeClient } from '@kiddies/youtube-client';
import { getRemainingScreenTime } from '../utils/screentime.js';
import { config } from '../config.js';

const yt = new YouTubeClient({ apiKey: config.YOUTUBE_API_KEY });

export async function childRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Browse & Discover ─────────────────────────────────────────────────────
  fastify.get('/browse', { preHandler: [requireChild] }, async (req, reply) => {
    const query = req.query as { page?: string; limit?: string; category?: string };
    const childId = req.user.id;
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const offset = (page - 1) * limit;

    const conditions = [eq(approvedContent.childId, childId)];

    const items = await db.select({
      approvedContentId: approvedContent.id,
      approvedAt: approvedContent.approvedAt,
      watchCount: approvedContent.watchCount,
      lastWatchedAt: approvedContent.lastWatchedAt,
      id: contentItems.id,
      title: contentItems.title,
      channelName: contentItems.channelName,
      channelId: contentItems.channelId,
      thumbnailUrl: contentItems.thumbnailUrl,
      durationSeconds: contentItems.durationSeconds,
      platformContentId: contentItems.platformContentId,
      categoryLabel: contentItems.categoryLabel,
      aiSafetyScore: contentItems.aiSafetyScore,
      tags: contentItems.tags,
    })
      .from(approvedContent)
      .innerJoin(contentItems, eq(contentItems.id, approvedContent.contentId))
      .where(and(
        ...conditions,
        or(isNull(approvedContent.expiresAt), gte(approvedContent.expiresAt, new Date())),
      ))
      .orderBy(desc(approvedContent.approvedAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db.select({ total: sql<number>`count(*)` })
      .from(approvedContent)
      .where(and(...conditions, or(isNull(approvedContent.expiresAt), gte(approvedContent.expiresAt, new Date()))));

    return reply.send({
      success: true,
      data: items,
      pagination: { total: Number(total), page, pageSize: limit, totalPages: Math.ceil(Number(total) / limit) },
    });
  });

  fastify.get('/browse/search', { preHandler: [requireChild] }, async (req, reply) => {
    const query = req.query as { q?: string };
    const childId = req.user.id;
    if (!query.q || query.q.length < 2) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Query must be at least 2 characters' } });
    }

    const term = `%${query.q}%`;
    const items = await db.select({
      id: contentItems.id,
      title: contentItems.title,
      channelName: contentItems.channelName,
      thumbnailUrl: contentItems.thumbnailUrl,
      durationSeconds: contentItems.durationSeconds,
      platformContentId: contentItems.platformContentId,
    })
      .from(approvedContent)
      .innerJoin(contentItems, eq(contentItems.id, approvedContent.contentId))
      .where(and(
        eq(approvedContent.childId, childId),
        or(
          sql`LOWER(${contentItems.title}) LIKE LOWER(${term})`,
          sql`LOWER(${contentItems.channelName}) LIKE LOWER(${term})`,
        ),
      ))
      .limit(20);

    return reply.send({ success: true, data: items });
  });

  fastify.get('/library', { preHandler: [requireChild] }, async (req, reply) => {
    const childId = req.user.id;
    const items = await db.select({
      id: contentItems.id,
      title: contentItems.title,
      channelName: contentItems.channelName,
      thumbnailUrl: contentItems.thumbnailUrl,
      durationSeconds: contentItems.durationSeconds,
      platformContentId: contentItems.platformContentId,
      watchCount: approvedContent.watchCount,
      lastWatchedAt: approvedContent.lastWatchedAt,
      categoryLabel: contentItems.categoryLabel,
    })
      .from(approvedContent)
      .innerJoin(contentItems, eq(contentItems.id, approvedContent.contentId))
      .where(and(
        eq(approvedContent.childId, childId),
        or(isNull(approvedContent.expiresAt), gte(approvedContent.expiresAt, new Date())),
      ))
      .orderBy(desc(approvedContent.lastWatchedAt))
      .limit(100);

    return reply.send({ success: true, data: items });
  });

  fastify.get('/recommendations', { preHandler: [requireChild] }, async (req, reply) => {
    const childId = req.user.id;
    const recs = await db.select({
      id: recommendations.id,
      score: recommendations.score,
      reasonCode: recommendations.reasonCode,
      reasonLabel: recommendations.reasonLabel,
      contentId: contentItems.id,
      title: contentItems.title,
      channelName: contentItems.channelName,
      thumbnailUrl: contentItems.thumbnailUrl,
      durationSeconds: contentItems.durationSeconds,
      platformContentId: contentItems.platformContentId,
      aiSafetyScore: contentItems.aiSafetyScore,
    })
      .from(recommendations)
      .innerJoin(contentItems, eq(contentItems.id, recommendations.contentId))
      .where(and(
        eq(recommendations.childId, childId),
        gte(recommendations.expiresAt, new Date()),
      ))
      .orderBy(desc(recommendations.score))
      .limit(30);

    // Mark as shown
    if (recs.length > 0) {
      const ids = recs.map((r) => r.id);
      await db.update(recommendations).set({ shownToChild: true })
        .where(sql`${recommendations.id} = ANY(ARRAY[${sql.join(ids.map(id => sql`${id}`), sql`, `)}]::uuid[])`);
    }

    return reply.send({ success: true, data: recs });
  });

  // ── Content Requests ───────────────────────────────────────────────────────
  fastify.post('/requests', { preHandler: [requireChild] }, async (req, reply) => {
    const body = req.body as { youtubeVideoId: string; note?: string };
    if (!body.youtubeVideoId) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'youtubeVideoId required' } });
    }

    const childId = req.user.id;
    const parentId = req.user.parentId;
    if (!parentId) return reply.status(400).send({ success: false, error: { code: 'NO_PARENT', message: 'No parent associated' } });

    // Check for duplicate pending request
    const existing = await db.select({ id: contentRequests.id })
      .from(contentRequests)
      .innerJoin(contentItems, and(eq(contentItems.id, contentRequests.contentId), eq(contentItems.platformContentId, body.youtubeVideoId)))
      .where(and(eq(contentRequests.childId, childId), eq(contentRequests.status, 'pending')));

    if (existing.length > 0) {
      return reply.status(409).send({ success: false, error: { code: 'DUPLICATE_REQUEST', message: 'You already have a pending request for this video' } });
    }

    // Fetch or create content item
    let contentItem = (await db.select().from(contentItems)
      .where(and(eq(contentItems.platform, 'youtube'), eq(contentItems.platformContentId, body.youtubeVideoId))))[0];

    if (!contentItem && config.YOUTUBE_API_KEY) {
      const videoMeta = await yt.getVideo(body.youtubeVideoId);
      if (!videoMeta) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found' } });

      const [inserted] = await db.insert(contentItems).values({
        platform: 'youtube',
        platformContentId: body.youtubeVideoId,
        title: videoMeta.title,
        description: videoMeta.description,
        channelName: videoMeta.channelTitle,
        channelId: videoMeta.channelId,
        thumbnailUrl: videoMeta.thumbnailUrl,
        durationSeconds: videoMeta.durationSeconds,
        publishedAt: new Date(videoMeta.publishedAt),
        tags: videoMeta.tags,
        isLive: videoMeta.isLive,
      }).onConflictDoNothing().returning();
      contentItem = inserted;
    }

    if (!contentItem) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Video could not be found' } });

    const [request] = await db.insert(contentRequests).values({
      childId,
      parentId,
      contentId: contentItem.id,
      childNote: body.note ?? null,
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000),
    }).returning();

    // Notify parent
    const [child] = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, childId));
    await notificationQueue.add('notify', {
      type: 'content_request',
      parentId,
      childId,
      contentId: contentItem.id,
      requestId: request!.id,
      contentTitle: contentItem.title,
      childName: child?.displayName ?? 'Your child',
    });

    return reply.status(201).send({ success: true, data: { request, content: contentItem } });
  });

  fastify.get('/requests', { preHandler: [requireChild] }, async (req, reply) => {
    const childId = req.user.id;
    const requests = await db.select({
      id: contentRequests.id,
      status: contentRequests.status,
      childNote: contentRequests.childNote,
      parentNote: contentRequests.parentNote,
      requestedAt: contentRequests.requestedAt,
      decidedAt: contentRequests.decidedAt,
      title: contentItems.title,
      thumbnailUrl: contentItems.thumbnailUrl,
      channelName: contentItems.channelName,
      platformContentId: contentItems.platformContentId,
    })
      .from(contentRequests)
      .innerJoin(contentItems, eq(contentItems.id, contentRequests.contentId))
      .where(eq(contentRequests.childId, childId))
      .orderBy(desc(contentRequests.requestedAt))
      .limit(50);

    return reply.send({ success: true, data: requests });
  });

  // ── Watch / Playback ───────────────────────────────────────────────────────
  fastify.get('/watch/:contentId', { preHandler: [requireChild] }, async (req, reply) => {
    const { contentId } = req.params as { contentId: string };
    const childId = req.user.id;

    // Verify approved
    const [approved] = await db.select().from(approvedContent)
      .where(and(
        eq(approvedContent.childId, childId),
        eq(approvedContent.contentId, contentId),
        or(isNull(approvedContent.expiresAt), gte(approvedContent.expiresAt, new Date())),
      ));

    if (!approved) {
      return reply.status(403).send({ success: false, error: { code: 'NOT_APPROVED', message: 'This content is not in your approved library' } });
    }

    // Check screen time
    const screenTime = await getRemainingScreenTime(childId, db);
    if (screenTime.remaining <= 0) {
      return reply.status(403).send({ success: false, error: { code: 'SCREEN_TIME_EXCEEDED', message: 'Screen time limit reached for today' } });
    }
    if (!screenTime.withinSchedule) {
      return reply.status(403).send({ success: false, error: { code: 'OUTSIDE_SCHEDULE', message: 'Screen time is not allowed right now' } });
    }

    const [content] = await db.select().from(contentItems).where(eq(contentItems.id, contentId));
    if (!content) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });

    return reply.send({
      success: true,
      data: {
        videoId: content.platformContentId,
        platform: content.platform,
        playerConfig: {
          rel: 0,
          modestbranding: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
        },
        screenTimeRemaining: screenTime.remaining,
      },
    });
  });

  fastify.post('/watch/sessions', { preHandler: [requireChild] }, async (req, reply) => {
    const body = req.body as { contentId: string; deviceType?: string };
    const childId = req.user.id;

    const [approved] = await db.select({ id: approvedContent.id }).from(approvedContent)
      .where(and(eq(approvedContent.childId, childId), eq(approvedContent.contentId, body.contentId)));

    const [session] = await db.insert(watchSessions).values({
      childId,
      contentId: body.contentId,
      approvedContentId: approved?.id ?? null,
      deviceType: body.deviceType ?? 'mobile',
    }).returning();

    return reply.status(201).send({ success: true, data: { sessionId: session!.id } });
  });

  fastify.put('/watch/sessions/:sessionId/heartbeat', { preHandler: [requireChild] }, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { watchSeconds: number };
    const childId = req.user.id;

    await db.update(watchSessions).set({ watchSeconds: body.watchSeconds })
      .where(and(eq(watchSessions.id, sessionId), eq(watchSessions.childId, childId)));

    // Update approved content watch count and last watched
    const [session] = await db.select({ contentId: watchSessions.contentId }).from(watchSessions).where(eq(watchSessions.id, sessionId));
    if (session) {
      await db.update(approvedContent).set({ lastWatchedAt: new Date(), watchCount: sql`${approvedContent.watchCount} + 1` })
        .where(and(eq(approvedContent.childId, childId), eq(approvedContent.contentId, session.contentId)));
    }

    const remaining = await getRemainingScreenTime(childId, db);
    return reply.send({ success: true, data: { screenTimeRemaining: remaining.remaining } });
  });

  fastify.post('/watch/sessions/:sessionId/end', { preHandler: [requireChild] }, async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const body = req.body as { watchSeconds: number };
    const childId = req.user.id;

    await db.update(watchSessions).set({
      endedAt: new Date(),
      watchSeconds: body.watchSeconds,
    }).where(and(eq(watchSessions.id, sessionId), eq(watchSessions.childId, childId)));

    return reply.send({ success: true, data: { message: 'Session ended' } });
  });

  // ── Screen Time ────────────────────────────────────────────────────────────
  fastify.get('/screen-time/today', { preHandler: [requireChild] }, async (req, reply) => {
    const childId = req.user.id;
    const summary = await getRemainingScreenTime(childId, db);
    return reply.send({ success: true, data: summary });
  });

  // ── Profile ────────────────────────────────────────────────────────────────
  fastify.get('/profile', { preHandler: [requireChild] }, async (req, reply) => {
    const childId = req.user.id;
    const [profile] = await db.select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      dateOfBirth: childProfiles.dateOfBirth,
      ageGroup: childProfiles.ageGroup,
      screenTimeDailyLimitMinutes: childProfiles.screenTimeDailyLimitMinutes,
    })
      .from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(eq(users.id, childId));

    return reply.send({ success: true, data: profile });
  });
}
