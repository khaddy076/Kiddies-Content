import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { z } from 'zod';
import { createDb, childProfiles } from '@kiddies/db';
import { generateRecommendations } from './engine/index.js';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  RECOMMENDATION_TOP_N: z.coerce.number().default(30),
  RECOMMENDATION_COMMUNITY_MIN_PARENTS: z.coerce.number().default(10),
  RECOMMENDATION_COLD_START_THRESHOLD: z.coerce.number().default(5),
  AI_SAFETY_SCORE_THRESHOLD: z.coerce.number().default(0.7),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { console.error('❌ Invalid env:', parsed.error.flatten()); process.exit(1); }
const config = parsed.data;

const db = createDb(config.DATABASE_URL);
const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });

const recommendationConfig = {
  topN: config.RECOMMENDATION_TOP_N,
  communityMinParents: config.RECOMMENDATION_COMMUNITY_MIN_PARENTS,
  coldStartThreshold: config.RECOMMENDATION_COLD_START_THRESHOLD,
  safetyThreshold: config.AI_SAFETY_SCORE_THRESHOLD,
};

const worker = new Worker(
  'recommendation',
  async (job) => {
    const data = job.data as { childId?: string; refreshAll?: boolean };

    if (data.refreshAll) {
      console.log('[Recommendation Worker] Refreshing all children...');
      const children = await db.select({ userId: childProfiles.userId }).from(childProfiles);
      for (const child of children) {
        await generateRecommendations(child.userId, db, recommendationConfig);
        await new Promise((r) => setTimeout(r, 2000)); // 2s delay between each
      }
      console.log(`[Recommendation Worker] Refreshed ${children.length} children`);
      return;
    }

    if (data.childId) {
      await generateRecommendations(data.childId, db, recommendationConfig);
    }
  },
  {
    connection: redis,
    concurrency: 3,
    limiter: { max: 10, duration: 10000 },
  },
);

worker.on('completed', (job) => {
  console.log(`[Recommendation Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Recommendation Worker] Job ${job?.id} failed:`, err.message);
});

// Schedule periodic refresh every 6 hours
import { Queue } from 'bullmq';
const recommendationQueue = new Queue('recommendation', { connection: redis });

async function scheduleRefresh() {
  await recommendationQueue.add(
    'refresh-all',
    { refreshAll: true },
    {
      repeat: { pattern: '0 */6 * * *' }, // every 6 hours
      jobId: 'refresh-all-recurring',
    },
  );
  console.log('[Recommendation Scheduler] Periodic refresh scheduled (every 6 hours)');
}

void scheduleRefresh();

process.on('SIGTERM', async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await worker.close();
  await redis.quit();
  process.exit(0);
});

console.log('✅ Recommendation worker started');
