import { Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { redis } from '../redis.js';

const connection = redis as unknown as ConnectionOptions;

export const notificationQueue = new Queue('notification', { connection });
export const recommendationQueue = new Queue('recommendation', { connection });
export const contentSafetyQueue = new Queue('content-safety', { connection });
export const emailQueue = new Queue('email', { connection });

export type NotificationJobData =
  | { type: 'content_request'; parentId: string; childId: string; contentId: string; requestId: string; contentTitle: string; childName: string }
  | { type: 'request_approved'; childId: string; contentTitle: string; requestId: string }
  | { type: 'request_denied'; childId: string; contentTitle: string; parentNote: string | null; requestId: string }
  | { type: 'screen_time_warning'; childId: string; parentId: string; usedMinutes: number; limitMinutes: number }
  | { type: 'screen_time_exceeded'; childId: string; parentId: string }
  | { type: 'new_recommendations'; childId: string; parentId: string; count: number }
  | { type: 'weekly_summary'; parentId: string };

export type RecommendationJobData =
  | { childId: string }
  | { refreshAll: true };

export type ContentSafetyJobData = {
  contentId: string;
  videoId: string;
};
