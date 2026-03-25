import type { FastifyInstance } from 'fastify';
import { eq, and, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import dayjs from 'dayjs';
import { db } from '../db.js';
import {
  users, parentProfiles, childProfiles, contentRequests, contentItems,
  approvedContent, watchSessions, childContentFilters, screenTimeSchedules,
  notifications, platformConnections,
} from '@kiddies/db';
import { requireParent, requireParentOfChild } from '../middleware/auth.ts';
import { notificationQueue, recommendationQueue } from '../queues/index.js';
import { YouTubeClient } from '@kiddies/youtube-client';
import { config } from '../config.js';
import { encrypt } from '../utils/encryption.js';
import { getTodayScreenTimeMinutes } from '../utils/screentime.js';

const yt = new YouTubeClient({ apiKey: config.YOUTUBE_API_KEY });

export async function parentRoutes(fastify: FastifyInstance): Promise<void> {
  // ── Profile ──────────────────────────────────────────────────────────────
  fastify.get('/profile', { preHandler: [requireParent] }, async (req, reply) => {
    const [profile] = await db.select().from(parentProfiles).where(eq(parentProfiles.userId, req.user.id));
    const [user] = await db.select({ id: users.id, email: users.email, displayName: users.displayName, phone: users.phone, avatarUrl: users.avatarUrl, isVerified: users.isVerified }).from(users).where(eq(users.id, req.user.id));
    return reply.send({ success: true, data: { ...user, profile } });
  });

  fastify.put('/profile', { preHandler: [requireParent] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const allowed = ['religion', 'incomeBracket', 'countryCode', 'region', 'languagePreference', 'profileVisibility'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    if (Object.keys(updates).length > 0) {
      await db.update(parentProfiles).set({ ...updates, updatedAt: new Date() }).where(eq(parentProfiles.userId, req.user.id));
    }
    // Update display name if provided
    if (body['displayName']) {
      await db.update(users).set({ displayName: body['displayName'] as string, updatedAt: new Date() }).where(eq(users.id, req.user.id));
    }
    return reply.send({ success: true, data: { message: 'Profile updated' } });
  });

  // ── Children ─────────────────────────────────────────────────────────────
  fastify.get('/children', { preHandler: [requireParent] }, async (req, reply) => {
    const children = await db.select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      dateOfBirth: childProfiles.dateOfBirth,
      ageGroup: childProfiles.ageGroup,
      screenTimeDailyLimitMinutes: childProfiles.screenTimeDailyLimitMinutes,
      isCoppaSubject: childProfiles.isCoppaSubject,
    }).from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(eq(childProfiles.parentId, req.user.id));

    // Add today's screen time for each child
    const childrenWithTime = await Promise.all(
      children.map(async (child) => ({
        ...child,
        todayScreenTimeMinutes: await getTodayScreenTimeMinutes(child.id, db),
      })),
    );

    return reply.send({ success: true, data: childrenWithTime });
  });

  // GET /parent/children/:childId
  fastify.get('/children/:childId', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const [child] = await db.select({
      id: users.id,
      name: users.displayName,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
      ageGroup: childProfiles.ageGroup,
      dateOfBirth: childProfiles.dateOfBirth,
      screenTimeLimitMinutes: childProfiles.screenTimeDailyLimitMinutes,
    }).from(users)
      .innerJoin(childProfiles, eq(childProfiles.userId, users.id))
      .where(eq(users.id, childId));

    if (!child) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Child not found' } });
    return reply.send({ success: true, data: { ...child, isPaused: !child.isActive } });
  });

  // PUT /parent/children/:childId
  fastify.put('/children/:childId', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const body = req.body as { isPaused?: boolean; screenTimeLimitMinutes?: number };
    if (body.isPaused !== undefined) {
      await db.update(users).set({ isActive: !body.isPaused, updatedAt: new Date() }).where(eq(users.id, childId));
    }
    if (body.screenTimeLimitMinutes !== undefined) {
      await db.update(childProfiles).set({ screenTimeDailyLimitMinutes: body.screenTimeLimitMinutes }).where(eq(childProfiles.userId, childId));
    }
    return reply.send({ success: true, data: { message: 'Child updated' } });
  });

  // GET /parent/children/:childId/screen-time
  fastify.get('/children/:childId/screen-time', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const [profile] = await db.select({ limitMinutes: childProfiles.screenTimeDailyLimitMinutes })
      .from(childProfiles).where(eq(childProfiles.userId, childId));

    const todayMinutes = await getTodayScreenTimeMinutes(childId, db);
    const limitMinutes = profile?.limitMinutes ?? 120;

    const weekStart = dayjs().subtract(6, 'days').startOf('day').toDate();
    const [{ weeklySeconds }] = await db.select({
      weeklySeconds: sql<number>`COALESCE(SUM(${watchSessions.watchSeconds}), 0)`,
    }).from(watchSessions).where(and(eq(watchSessions.childId, childId), gte(watchSessions.startedAt, weekStart)));

    const weeklyMinutes = Math.round(Number(weeklySeconds) / 60);
    const percentage = limitMinutes > 0 ? Math.round((todayMinutes / limitMinutes) * 100) : 0;

    return reply.send({ success: true, data: { todayMinutes, limitMinutes, percentage, weeklyMinutes } });
  });

  // ── Content Requests ──────────────────────────────────────────────────────
  fastify.get('/requests', { preHandler: [requireParent] }, async (req, reply) => {
    const query = req.query as { status?: string; page?: string; limit?: string };
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const offset = (page - 1) * limit;

    const conditions = [eq(contentRequests.parentId, req.user.id)];
    if (query.status && ['pending', 'approved', 'denied', 'expired'].includes(query.status)) {
      conditions.push(eq(contentRequests.status, query.status as 'pending' | 'approved' | 'denied' | 'expired'));
    }

    const [requests, [countResult]] = await Promise.all([
      db.select({
        id: contentRequests.id,
        status: contentRequests.status,
        childNote: contentRequests.childNote,
        parentNote: contentRequests.parentNote,
        requestedAt: contentRequests.requestedAt,
        decidedAt: contentRequests.decidedAt,
        expiresAt: contentRequests.expiresAt,
        childId: contentRequests.childId,
        childName: users.displayName,
        childAvatar: users.avatarUrl,
        contentId: contentItems.id,
        videoTitle: contentItems.title,
        channelName: contentItems.channelName,
        thumbnailUrl: contentItems.thumbnailUrl,
        durationSeconds: contentItems.durationSeconds,
        platformContentId: contentItems.platformContentId,
        aiSafetyScore: contentItems.aiSafetyScore,
      })
        .from(contentRequests)
        .innerJoin(contentItems, eq(contentItems.id, contentRequests.contentId))
        .innerJoin(users, eq(users.id, contentRequests.childId))
        .where(and(...conditions))
        .orderBy(desc(contentRequests.requestedAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: sql<number>`count(*)` })
        .from(contentRequests)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult?.total ?? 0);
    return reply.send({
      success: true,
      data: requests,
      pagination: { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) },
    });
  });

  fastify.get('/requests/:id', { preHandler: [requireParent] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [request] = await db.select({
      id: contentRequests.id,
      status: contentRequests.status,
      childNote: contentRequests.childNote,
      parentNote: contentRequests.parentNote,
      requestedAt: contentRequests.requestedAt,
      decidedAt: contentRequests.decidedAt,
      expiresAt: contentRequests.expiresAt,
      childId: contentRequests.childId,
      childName: users.displayName,
      contentId: contentItems.id,
      videoTitle: contentItems.title,
      channelName: contentItems.channelName,
      channelId: contentItems.channelId,
      thumbnailUrl: contentItems.thumbnailUrl,
      durationSeconds: contentItems.durationSeconds,
      platformContentId: contentItems.platformContentId,
      aiSafetyScore: contentItems.aiSafetyScore,
      aiSafetyLabels: contentItems.aiSafetyLabels,
      description: contentItems.description,
    })
      .from(contentRequests)
      .innerJoin(contentItems, eq(contentItems.id, contentRequests.contentId))
      .innerJoin(users, eq(users.id, contentRequests.childId))
      .where(and(eq(contentRequests.id, id), eq(contentRequests.parentId, req.user.id)));

    if (!request) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } });
    return reply.send({ success: true, data: request });
  });

  fastify.post('/requests/:id/approve', { preHandler: [requireParent] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { note?: string } | undefined;

    const [request] = await db.select().from(contentRequests)
      .where(and(eq(contentRequests.id, id), eq(contentRequests.parentId, req.user.id), eq(contentRequests.status, 'pending')));

    if (!request) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Pending request not found' } });

    await db.transaction(async (tx) => {
      await tx.update(contentRequests).set({
        status: 'approved',
        decidedAt: new Date(),
        parentNote: body?.note ?? null,
      }).where(eq(contentRequests.id, id));

      await tx.insert(approvedContent).values({
        childId: request.childId,
        contentId: request.contentId,
        approvedBy: req.user.id,
      }).onConflictDoNothing();
    });

    // Notify child
    const [content] = await db.select({ title: contentItems.title }).from(contentItems).where(eq(contentItems.id, request.contentId));
    await notificationQueue.add('notify', {
      type: 'request_approved',
      childId: request.childId,
      contentTitle: content?.title ?? 'A video',
      requestId: id,
    });

    return reply.send({ success: true, data: { message: 'Request approved' } });
  });

  fastify.post('/requests/:id/deny', { preHandler: [requireParent] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { note?: string };

    const [request] = await db.select().from(contentRequests)
      .where(and(eq(contentRequests.id, id), eq(contentRequests.parentId, req.user.id), eq(contentRequests.status, 'pending')));

    if (!request) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Pending request not found' } });

    await db.update(contentRequests).set({
      status: 'denied',
      decidedAt: new Date(),
      parentNote: body.note ?? null,
    }).where(eq(contentRequests.id, id));

    const [content] = await db.select({ title: contentItems.title }).from(contentItems).where(eq(contentItems.id, request.contentId));
    await notificationQueue.add('notify', {
      type: 'request_denied',
      childId: request.childId,
      contentTitle: content?.title ?? 'A video',
      parentNote: body.note ?? null,
      requestId: id,
    });

    return reply.send({ success: true, data: { message: 'Request denied' } });
  });

  // Pre-approve by YouTube video ID
  fastify.post('/content/pre-approve', { preHandler: [requireParent] }, async (req, reply) => {
    const body = req.body as { youtubeVideoId: string; childId: string };
    if (!body.youtubeVideoId || !body.childId) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'youtubeVideoId and childId required' } });
    }

    // Verify child belongs to parent
    const [profile] = await db.select().from(childProfiles)
      .where(and(eq(childProfiles.userId, body.childId), eq(childProfiles.parentId, req.user.id)));
    if (!profile) return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Child not found' } });

    // Fetch or get cached content
    let content = await db.select().from(contentItems)
      .where(and(eq(contentItems.platform, 'youtube'), eq(contentItems.platformContentId, body.youtubeVideoId)));

    if (content.length === 0) {
      if (config.YOUTUBE_API_KEY && config.YOUTUBE_API_KEY !== 'PLACEHOLDER_ADD_YOUR_KEY') {
        const videoMeta = await yt.getVideo(body.youtubeVideoId);
        if (!videoMeta) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found on YouTube' } });

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

        if (inserted) content = [inserted];
      } else {
        // No API key — store minimal record so the video can still be approved
        const thumbnailUrl = `https://img.youtube.com/vi/${body.youtubeVideoId}/hqdefault.jpg`;
        const [inserted] = await db.insert(contentItems).values({
          platform: 'youtube',
          platformContentId: body.youtubeVideoId,
          title: `YouTube Video (${body.youtubeVideoId})`,
          thumbnailUrl,
          tags: [],
        }).onConflictDoNothing().returning();
        if (inserted) content = [inserted];
      }
    }

    const item = content[0];
    if (!item) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });

    if (item.aiSafetyScore !== null && item.aiSafetyScore !== undefined && item.aiSafetyScore < config.AI_SAFETY_SCORE_THRESHOLD) {
      return reply.status(422).send({ success: false, error: { code: 'UNSAFE_CONTENT', message: 'This content did not pass safety checks' } });
    }

    await db.insert(approvedContent).values({
      childId: body.childId,
      contentId: item.id,
      approvedBy: req.user.id,
    }).onConflictDoNothing();

    return reply.send({ success: true, data: { message: 'Content pre-approved', content: item } });
  });

  // ── Library ───────────────────────────────────────────────────────────────
  fastify.get('/library/:childId', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const query = req.query as { page?: string; limit?: string };
    const page = parseInt(query.page ?? '1');
    const limit = parseInt(query.limit ?? '20');
    const offset = (page - 1) * limit;

    const [items, [countResult]] = await Promise.all([
      db.select({
        id: approvedContent.id,
        approvedAt: approvedContent.approvedAt,
        expiresAt: approvedContent.expiresAt,
        watchCount: approvedContent.watchCount,
        lastWatchedAt: approvedContent.lastWatchedAt,
        contentId: contentItems.id,
        title: contentItems.title,
        channelName: contentItems.channelName,
        thumbnailUrl: contentItems.thumbnailUrl,
        durationSeconds: contentItems.durationSeconds,
        platformContentId: contentItems.platformContentId,
        aiSafetyScore: contentItems.aiSafetyScore,
      })
        .from(approvedContent)
        .innerJoin(contentItems, eq(contentItems.id, approvedContent.contentId))
        .where(eq(approvedContent.childId, childId))
        .orderBy(desc(approvedContent.approvedAt))
        .limit(limit)
        .offset(offset),

      db.select({ total: sql<number>`count(*)` }).from(approvedContent).where(eq(approvedContent.childId, childId)),
    ]);

    const total = Number(countResult?.total ?? 0);
    return reply.send({ success: true, data: items, pagination: { total, page, pageSize: limit, totalPages: Math.ceil(total / limit) } });
  });

  fastify.delete('/library/:childId/:contentId', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId, contentId } = req.params as { childId: string; contentId: string };
    await db.delete(approvedContent).where(and(eq(approvedContent.childId, childId), eq(approvedContent.contentId, contentId)));
    return reply.send({ success: true, data: { message: 'Removed from library' } });
  });

  // ── Filters ───────────────────────────────────────────────────────────────
  fastify.get('/children/:childId/filters', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const filters = await db.select().from(childContentFilters).where(eq(childContentFilters.childId, childId));
    return reply.send({ success: true, data: filters });
  });

  fastify.post('/children/:childId/filters', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const body = req.body as { filterType: string; filterValue: string };
    if (!body.filterType || !body.filterValue) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'filterType and filterValue required' } });
    }
    const [filter] = await db.insert(childContentFilters).values({
      childId,
      filterType: body.filterType as 'block_category' | 'block_channel' | 'block_tag' | 'require_min_rating',
      filterValue: body.filterValue,
      createdBy: req.user.id,
    }).onConflictDoNothing().returning();
    return reply.status(201).send({ success: true, data: filter });
  });

  fastify.delete('/children/:childId/filters/:filterId', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId, filterId } = req.params as { childId: string; filterId: string };
    await db.delete(childContentFilters).where(and(eq(childContentFilters.id, filterId), eq(childContentFilters.childId, childId)));
    return reply.send({ success: true, data: { message: 'Filter removed' } });
  });

  // ── Schedule ──────────────────────────────────────────────────────────────
  fastify.get('/children/:childId/schedule', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const schedules = await db.select().from(screenTimeSchedules)
      .where(eq(screenTimeSchedules.childId, childId))
      .orderBy(asc(screenTimeSchedules.dayOfWeek));
    return reply.send({ success: true, data: schedules });
  });

  fastify.put('/children/:childId/schedule', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const body = req.body as Array<{ dayOfWeek: number; allowedStart: string; allowedEnd: string }>;
    if (!Array.isArray(body)) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Body must be an array' } });

    await db.delete(screenTimeSchedules).where(eq(screenTimeSchedules.childId, childId));
    if (body.length > 0) {
      await db.insert(screenTimeSchedules).values(
        body.map((s) => ({ childId, dayOfWeek: s.dayOfWeek, allowedStart: s.allowedStart, allowedEnd: s.allowedEnd, createdBy: req.user.id })),
      );
    }
    return reply.send({ success: true, data: { message: 'Schedule updated' } });
  });

  // ── Emergency Controls ────────────────────────────────────────────────────
  fastify.post('/children/pause-all', { preHandler: [requireParent] }, async (req, reply) => {
    const children = await db.select({ userId: childProfiles.userId }).from(childProfiles).where(eq(childProfiles.parentId, req.user.id));
    const childIds = children.map((c) => c.userId);
    if (childIds.length > 0) {
      await db.update(users).set({ isActive: false }).where(inArray(users.id, childIds));
    }
    return reply.send({ success: true, data: { message: 'All children paused', count: childIds.length } });
  });

  fastify.post('/children/resume-all', { preHandler: [requireParent] }, async (req, reply) => {
    const children = await db.select({ userId: childProfiles.userId }).from(childProfiles).where(eq(childProfiles.parentId, req.user.id));
    const childIds = children.map((c) => c.userId);
    if (childIds.length > 0) {
      await db.update(users).set({ isActive: true }).where(inArray(users.id, childIds));
    }
    return reply.send({ success: true, data: { message: 'All children resumed', count: childIds.length } });
  });

  // ── Analytics ─────────────────────────────────────────────────────────────
  fastify.get('/analytics/:childId/watch-time', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };
    const thirtyDaysAgo = dayjs().subtract(30, 'days').toDate();

    const result = await db.select({
      date: sql<string>`DATE(${watchSessions.startedAt})`,
      totalMinutes: sql<number>`ROUND(SUM(${watchSessions.watchSeconds}) / 60.0)`,
    })
      .from(watchSessions)
      .where(and(eq(watchSessions.childId, childId), gte(watchSessions.startedAt, thirtyDaysAgo)))
      .groupBy(sql`DATE(${watchSessions.startedAt})`)
      .orderBy(sql`DATE(${watchSessions.startedAt})`);

    return reply.send({ success: true, data: result });
  });

  fastify.get('/analytics/:childId/content', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };

    const result = await db.select({
      contentId: watchSessions.contentId,
      title: contentItems.title,
      channelName: contentItems.channelName,
      thumbnailUrl: contentItems.thumbnailUrl,
      totalWatchMinutes: sql<number>`ROUND(SUM(${watchSessions.watchSeconds}) / 60.0)`,
      sessionCount: sql<number>`COUNT(*)`,
    })
      .from(watchSessions)
      .innerJoin(contentItems, eq(contentItems.id, watchSessions.contentId))
      .where(eq(watchSessions.childId, childId))
      .groupBy(watchSessions.contentId, contentItems.title, contentItems.channelName, contentItems.thumbnailUrl)
      .orderBy(desc(sql`SUM(${watchSessions.watchSeconds})`))
      .limit(20);

    return reply.send({ success: true, data: result });
  });

  fastify.get('/analytics/:childId/categories', { preHandler: [requireParentOfChild()] }, async (req, reply) => {
    const { childId } = req.params as { childId: string };

    const result = await db.select({
      category: contentItems.categoryLabel,
      totalMinutes: sql<number>`ROUND(SUM(${watchSessions.watchSeconds}) / 60.0)`,
    })
      .from(watchSessions)
      .innerJoin(contentItems, eq(contentItems.id, watchSessions.contentId))
      .where(eq(watchSessions.childId, childId))
      .groupBy(contentItems.categoryLabel)
      .orderBy(desc(sql`SUM(${watchSessions.watchSeconds})`));

    return reply.send({ success: true, data: result });
  });

  // ── Notifications ─────────────────────────────────────────────────────────
  fastify.get('/notifications', { preHandler: [requireParent] }, async (req, reply) => {
    const items = await db.select().from(notifications)
      .where(eq(notifications.userId, req.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const [{ unread }] = await db.select({ unread: sql<number>`count(*)` }).from(notifications)
      .where(and(eq(notifications.userId, req.user.id), eq(notifications.isRead, false)));

    return reply.send({ success: true, data: { notifications: items, unreadCount: Number(unread) } });
  });

  fastify.put('/notifications/:id/read', { preHandler: [requireParent] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    await db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.user.id)));
    return reply.send({ success: true, data: { message: 'Marked as read' } });
  });

  fastify.put('/notifications/read-all', { preHandler: [requireParent] }, async (req, reply) => {
    await db.update(notifications).set({ isRead: true, readAt: new Date() })
      .where(and(eq(notifications.userId, req.user.id), eq(notifications.isRead, false)));
    return reply.send({ success: true, data: { message: 'All notifications marked as read' } });
  });

  // ── Platform Connections ──────────────────────────────────────────────────
  fastify.get('/platforms', { preHandler: [requireParent] }, async (req, reply) => {
    const connections = await db.select({
      id: platformConnections.id,
      platform: platformConnections.platform,
      platformUserId: platformConnections.platformUserId,
      isActive: platformConnections.isActive,
      createdAt: platformConnections.createdAt,
    }).from(platformConnections).where(eq(platformConnections.parentId, req.user.id));
    return reply.send({ success: true, data: connections });
  });

  fastify.get('/platforms/youtube/connect', { preHandler: [requireParent] }, async (req, reply) => {
    if (!config.YOUTUBE_OAUTH_CLIENT_ID) {
      return reply.status(501).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'YouTube OAuth not configured' } });
    }
    const state = Buffer.from(JSON.stringify({ userId: req.user.id })).toString('base64');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${config.YOUTUBE_OAUTH_CLIENT_ID}&` +
      `redirect_uri=${encodeURIComponent(config.YOUTUBE_OAUTH_REDIRECT_URI)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}&` +
      `state=${state}&access_type=offline&prompt=consent`;
    return reply.send({ success: true, data: { oauthUrl: url } });
  });

  fastify.get('/platforms/youtube/callback', async (req, reply) => {
    const query = req.query as { code?: string; state?: string; error?: string };
    if (query.error) return reply.redirect(`${config.WEB_URL}/settings?error=oauth_denied`);
    if (!query.code || !query.state) return reply.redirect(`${config.WEB_URL}/settings?error=oauth_invalid`);

    try {
      const state = JSON.parse(Buffer.from(query.state, 'base64').toString()) as { userId: string };

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: query.code,
          client_id: config.YOUTUBE_OAUTH_CLIENT_ID,
          client_secret: config.YOUTUBE_OAUTH_CLIENT_SECRET,
          redirect_uri: config.YOUTUBE_OAUTH_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenResponse.json() as { access_token: string; refresh_token: string; expires_in: number };

      await db.insert(platformConnections).values({
        parentId: state.userId,
        platform: 'youtube',
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        isActive: true,
      }).onConflictDoUpdate({
        target: [platformConnections.parentId, platformConnections.platform],
        set: {
          accessToken: encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          isActive: true,
        },
      });

      return reply.redirect(`${config.WEB_URL}/settings?connected=youtube`);
    } catch {
      return reply.redirect(`${config.WEB_URL}/settings?error=oauth_failed`);
    }
  });

  fastify.delete('/platforms/:platform', { preHandler: [requireParent] }, async (req, reply) => {
    const { platform } = req.params as { platform: string };
    await db.update(platformConnections).set({ isActive: false })
      .where(and(eq(platformConnections.parentId, req.user.id), eq(platformConnections.platform, platform as 'youtube')));
    return reply.send({ success: true, data: { message: 'Platform disconnected' } });
  });
}
