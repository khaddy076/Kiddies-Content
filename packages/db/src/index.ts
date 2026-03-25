import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

// ─── Default connection ───────────────────────────────────────────────────────

const DEFAULT_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://kiddies:kiddies_secret@localhost:5432/kiddies_content';

const defaultClient = postgres(DEFAULT_URL);

/**
 * Default drizzle db instance backed by the DATABASE_URL environment variable.
 * Import this in application code for convenience.
 */
export const db = drizzle(defaultClient, { schema });

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create an independent drizzle db instance for the given connection string.
 * Useful in tests or worker processes that need isolated connections.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

// ─── Schema re-exports ────────────────────────────────────────────────────────

export {
  // Tables
  users,
  parentProfiles,
  childProfiles,
  platformConnections,
  contentItems,
  contentRequests,
  approvedContent,
  watchSessions,
  childContentFilters,
  communityContentStats,
  recommendations,
  notifications,
  screenTimeSchedules,
  auditLog,
  deviceTokens,
  // Relations
  usersRelations,
  parentProfilesRelations,
  childProfilesRelations,
  platformConnectionsRelations,
  contentItemsRelations,
  contentRequestsRelations,
  approvedContentRelations,
  watchSessionsRelations,
  childContentFiltersRelations,
  communityContentStatsRelations,
  recommendationsRelations,
  notificationsRelations,
  screenTimeSchedulesRelations,
  auditLogRelations,
  deviceTokensRelations,
} from './schema.js';

export type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
