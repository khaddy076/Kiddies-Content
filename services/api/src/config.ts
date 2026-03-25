import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32),
  API_PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  YOUTUBE_API_KEY: z.string().default(''),
  AUTH_URL: z.string().default('http://localhost:3002'),
  YOUTUBE_OAUTH_CLIENT_ID: z.string().default(''),
  YOUTUBE_OAUTH_CLIENT_SECRET: z.string().default(''),
  YOUTUBE_OAUTH_REDIRECT_URI: z.string().default('http://localhost:3001/api/v1/parent/platforms/youtube/callback'),
  ENCRYPTION_KEY: z.string().default('0'.repeat(64)),
  AI_SAFETY_SCORE_THRESHOLD: z.coerce.number().default(0.7),
  RECOMMENDATION_TOP_N: z.coerce.number().default(30),
  WEB_URL: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;
