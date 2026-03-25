import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { contentItems } from '@kiddies/db';
import { requireParent, requireAuth } from '../middleware/auth.ts';
import { YouTubeClient } from '@kiddies/youtube-client';
import { config } from '../config.js';

const yt = new YouTubeClient({ apiKey: config.YOUTUBE_API_KEY });

export async function contentRoutes(fastify: FastifyInstance): Promise<void> {
  // Search YouTube (parent only)
  fastify.get('/search', { preHandler: [requireParent] }, async (req, reply) => {
    const query = req.query as { q?: string; maxResults?: string };
    if (!query.q) return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'q parameter required' } });
    if (!config.YOUTUBE_API_KEY) return reply.status(501).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'YouTube API not configured' } });

    const results = await yt.searchVideos(query.q, {
      maxResults: parseInt(query.maxResults ?? '25'),
      safeSearch: 'strict',
    });

    return reply.send({ success: true, data: results });
  });

  // Get content item by DB ID
  fastify.get('/:id', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    if (!item) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Content not found' } });
    return reply.send({ success: true, data: item });
  });

  // Fetch/cache YouTube video by video ID
  fastify.get('/youtube/:videoId', { preHandler: [requireParent] }, async (req, reply) => {
    const { videoId } = req.params as { videoId: string };

    // Check cache first
    const [cached] = await db.select().from(contentItems)
      .where(and(eq(contentItems.platform, 'youtube'), eq(contentItems.platformContentId, videoId)));

    if (cached) return reply.send({ success: true, data: cached });

    if (!config.YOUTUBE_API_KEY) {
      return reply.status(501).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'YouTube API not configured' } });
    }

    const videoMeta = await yt.getVideo(videoId);
    if (!videoMeta) return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Video not found on YouTube' } });

    const safety = (await yt.assessContentSafety(videoId));

    const [item] = await db.insert(contentItems).values({
      platform: 'youtube',
      platformContentId: videoId,
      title: videoMeta.title,
      description: videoMeta.description,
      channelName: videoMeta.channelTitle,
      channelId: videoMeta.channelId,
      thumbnailUrl: videoMeta.thumbnailUrl,
      durationSeconds: videoMeta.durationSeconds,
      publishedAt: new Date(videoMeta.publishedAt),
      tags: videoMeta.tags,
      isLive: videoMeta.isLive,
      aiSafetyScore: safety.score,
      aiSafetyLabels: {
        violence: safety.violenceScore,
        language: safety.languageScore,
        spam: safety.spamScore,
        sexualContent: safety.adultScore,
        overall: safety.score,
      },
    }).onConflictDoNothing().returning();

    return reply.send({ success: true, data: item });
  });

  // Get YouTube video categories
  fastify.get('/categories', { preHandler: [requireAuth] }, async (req, reply) => {
    const query = req.query as { regionCode?: string };
    if (!config.YOUTUBE_API_KEY) return reply.status(501).send({ success: false, error: { code: 'NOT_CONFIGURED', message: 'YouTube API not configured' } });
    const categories = await yt.getVideoCategories(query.regionCode);
    return reply.send({ success: true, data: categories });
  });

  // Flag content
  fastify.post('/:id/flag', { preHandler: [requireAuth] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as { reason?: string };

    fastify.log.warn({ contentId: id, reportedBy: req.user.id, reason: body.reason }, 'Content flagged');

    return reply.send({ success: true, data: { message: 'Content flagged for review. Thank you for helping keep kids safe.' } });
  });
}
