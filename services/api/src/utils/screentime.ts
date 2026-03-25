import { eq, and, gte, sql } from 'drizzle-orm';
import dayjs from 'dayjs';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '@kiddies/db';
import { watchSessions, childProfiles, screenTimeSchedules } from '@kiddies/db';

type DrizzleDb = PostgresJsDatabase<typeof schema>;

export async function getTodayScreenTimeMinutes(childId: string, database: DrizzleDb): Promise<number> {
  const todayStart = dayjs().startOf('day').toDate();

  const result = await database
    .select({ total: sql<number>`COALESCE(SUM(${watchSessions.watchSeconds}), 0)` })
    .from(watchSessions)
    .where(and(eq(watchSessions.childId, childId), gte(watchSessions.startedAt, todayStart)));

  return Math.floor((result[0]?.total ?? 0) / 60);
}

export async function isWithinSchedule(childId: string, database: DrizzleDb): Promise<boolean> {
  const now = dayjs();
  const dayOfWeek = now.day(); // 0=Sunday
  const currentTime = now.format('HH:mm:ss');

  const [schedule] = await database
    .select()
    .from(screenTimeSchedules)
    .where(and(eq(screenTimeSchedules.childId, childId), eq(screenTimeSchedules.dayOfWeek, dayOfWeek)));

  if (!schedule) return true; // No schedule = always allowed

  return currentTime >= schedule.allowedStart && currentTime <= schedule.allowedEnd;
}

export async function getRemainingScreenTime(
  childId: string,
  database: DrizzleDb,
): Promise<{ used: number; limit: number; remaining: number; withinSchedule: boolean }> {
  const [profile] = await database
    .select({ screenTimeDailyLimitMinutes: childProfiles.screenTimeDailyLimitMinutes })
    .from(childProfiles)
    .where(eq(childProfiles.userId, childId));

  const limit = profile?.screenTimeDailyLimitMinutes ?? 120;
  const used = await getTodayScreenTimeMinutes(childId, database);
  const withinSchedule = await isWithinSchedule(childId, database);

  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    withinSchedule,
  };
}
