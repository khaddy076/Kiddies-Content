import { Worker } from 'bullmq';
import Redis from 'ioredis';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createDb, deviceTokens, notifications, users, watchSessions, contentItems } from '@kiddies/db';
import dayjs from 'dayjs';
import { sql } from 'drizzle-orm';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  FIREBASE_PROJECT_ID: z.string().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().default(''),
  FIREBASE_PRIVATE_KEY: z.string().default(''),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('Kiddies Content <noreply@kiddies-content.com>'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEB_URL: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { console.error('❌ Invalid env:', parsed.error.flatten()); process.exit(1); }
const config = parsed.data;

const db = createDb(config.DATABASE_URL);
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });

// Firebase setup
let firebaseMessaging: admin.messaging.Messaging | null = null;
if (config.FIREBASE_PROJECT_ID && config.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.FIREBASE_PROJECT_ID,
      clientEmail: config.FIREBASE_CLIENT_EMAIL,
      privateKey: config.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  firebaseMessaging = admin.messaging();
  console.log('[Notification] Firebase initialized');
} else {
  console.warn('[Notification] Firebase not configured, push notifications disabled');
}

// Email setup
const emailTransporter = config.SMTP_USER
  ? nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, auth: { user: config.SMTP_USER, pass: config.SMTP_PASS } })
  : null;

async function sendPushToUser(userId: string, title: string, body: string, data: Record<string, string> = {}): Promise<void> {
  if (!firebaseMessaging) {
    console.log(`[Push - DEV] To: ${userId} | ${title}: ${body}`);
    return;
  }

  const tokens = await db.select({ token: deviceTokens.token, id: deviceTokens.id })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));

  for (const { token, id } of tokens) {
    try {
      await firebaseMessaging.send({ token, notification: { title, body }, data });
    } catch (err: unknown) {
      const errObj = err as { errorInfo?: { code: string } };
      if (errObj.errorInfo?.code === 'messaging/invalid-registration-token' ||
          errObj.errorInfo?.code === 'messaging/registration-token-not-registered') {
        await db.delete(deviceTokens).where(eq(deviceTokens.id, id));
      }
    }
  }
}

async function insertNotification(userId: string, type: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  await db.insert(notifications).values({
    userId,
    type: type as 'content_request',
    title,
    body,
    dataJson: data ?? null,
    sentAt: new Date(),
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!emailTransporter) {
    console.log(`[Email - DEV] To: ${to} | Subject: ${subject}`);
    return;
  }
  await emailTransporter.sendMail({ from: config.EMAIL_FROM, to, subject, html });
}

type JobData =
  | { type: 'content_request'; parentId: string; childId: string; contentId: string; requestId: string; contentTitle: string; childName: string }
  | { type: 'request_approved'; childId: string; contentTitle: string; requestId: string }
  | { type: 'request_denied'; childId: string; contentTitle: string; parentNote: string | null; requestId: string }
  | { type: 'screen_time_warning'; childId: string; parentId: string; usedMinutes: number; limitMinutes: number }
  | { type: 'screen_time_exceeded'; childId: string; parentId: string }
  | { type: 'new_recommendations'; childId: string; parentId: string; count: number }
  | { type: 'weekly_summary'; parentId: string };

const worker = new Worker(
  'notification',
  async (job) => {
    const data = job.data as JobData;

    try {
      switch (data.type) {
        case 'content_request': {
          const title = `${data.childName} wants to watch something`;
          const body = `"${data.contentTitle}" - Tap to approve or deny`;
          await sendPushToUser(data.parentId, title, body, { type: 'content_request', requestId: data.requestId });
          await insertNotification(data.parentId, 'content_request', title, body, { requestId: data.requestId, childId: data.childId });

          // Also send email
          const [parent] = await db.select({ email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, data.parentId));
          if (parent?.email) {
            const approveLink = `${config.WEB_URL}/requests?action=approve&id=${data.requestId}`;
            const denyLink = `${config.WEB_URL}/requests?action=deny&id=${data.requestId}`;
            await sendEmail(
              parent.email,
              `${data.childName} wants to watch "${data.contentTitle}"`,
              `<h2>Hi ${parent.displayName},</h2>
               <p><b>${data.childName}</b> wants to watch: <b>"${data.contentTitle}"</b></p>
               <div style="margin:24px 0;display:flex;gap:12px;">
                 <a href="${approveLink}" style="background:#10B981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">✓ Approve</a>
                 <a href="${denyLink}" style="background:#EF4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;">✗ Deny</a>
               </div>`,
            );
          }
          break;
        }

        case 'request_approved': {
          const title = 'Request approved! 🎉';
          const body = `You can now watch "${data.contentTitle}"`;
          await sendPushToUser(data.childId, title, body, { type: 'request_approved', requestId: data.requestId });
          await insertNotification(data.childId, 'request_approved', title, body, { requestId: data.requestId });
          break;
        }

        case 'request_denied': {
          const title = 'Request not approved';
          const body = data.parentNote ? `Your parent said: "${data.parentNote}"` : `"${data.contentTitle}" was not approved`;
          await sendPushToUser(data.childId, title, body, { type: 'request_denied', requestId: data.requestId });
          await insertNotification(data.childId, 'request_denied', title, body, { requestId: data.requestId });
          break;
        }

        case 'screen_time_warning': {
          const remaining = data.limitMinutes - data.usedMinutes;
          await sendPushToUser(data.parentId, 'Screen time warning', `${data.childId}'s screen time: ${data.usedMinutes}/${data.limitMinutes} mins used (${remaining} remaining)`);
          break;
        }

        case 'screen_time_exceeded': {
          await sendPushToUser(data.parentId, 'Screen time limit reached', `Your child has reached their daily screen time limit`);
          break;
        }

        case 'new_recommendations': {
          const title = 'New content recommendations';
          const body = `${data.count} new videos recommended for your child`;
          await sendPushToUser(data.parentId, title, body, { type: 'new_recommendations', childId: data.childId });
          await insertNotification(data.parentId, 'new_recommendation', title, body, { childId: data.childId, count: data.count });
          break;
        }

        case 'weekly_summary': {
          const [parent] = await db.select({ email: users.email, displayName: users.displayName }).from(users).where(eq(users.id, data.parentId));
          if (!parent?.email) break;

          const sevenDaysAgo = dayjs().subtract(7, 'days').toDate();
          const stats = await db.select({
            title: contentItems.title,
            totalMinutes: sql<number>`ROUND(SUM(${watchSessions.watchSeconds}) / 60.0)`,
          })
            .from(watchSessions)
            .innerJoin(contentItems, eq(contentItems.id, watchSessions.contentId))
            .where(and(eq(watchSessions.childId, data.parentId), sql`${watchSessions.startedAt} >= ${sevenDaysAgo}`))
            .groupBy(contentItems.title)
            .orderBy(sql`SUM(${watchSessions.watchSeconds}) DESC`)
            .limit(10);

          const rows = stats.map((s) => `<tr><td>${s.title}</td><td>${s.totalMinutes} min</td></tr>`).join('');
          await sendEmail(
            parent.email,
            'Your weekly Kiddies Content summary',
            `<h2>Weekly Summary for ${parent.displayName}</h2>
             <table border="1" cellpadding="8" style="border-collapse:collapse;">
               <tr><th>Content</th><th>Watch Time</th></tr>
               ${rows || '<tr><td colspan="2">No watch history this week</td></tr>'}
             </table>
             <p>Keep up the great parenting! 🌟</p>`,
          );
          break;
        }
      }
    } catch (err) {
      console.error(`[Notification Worker] Error processing job ${job.id}:`, err);
      throw err;
    }
  },
  { connection: redis, concurrency: 5 },
);

worker.on('completed', (job) => console.log(`[Notification Worker] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[Notification Worker] Job ${job?.id} failed:`, err.message));

process.on('SIGTERM', async () => { await worker.close(); await redis.quit(); process.exit(0); });
process.on('SIGINT', async () => { await worker.close(); await redis.quit(); process.exit(0); });

console.log('✅ Notification worker started');
