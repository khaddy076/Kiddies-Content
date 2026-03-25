import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  smallint,
  real,
  jsonb,
  timestamp,
  time,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// ─── users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    role: varchar('role', { length: 20 }).notNull().default('parent'),
    email: varchar('email', { length: 320 }).unique(),
    phone: varchar('phone', { length: 30 }).unique(),
    passwordHash: text('password_hash'),
    pinHash: text('pin_hash'),
    displayName: varchar('display_name', { length: 120 }).notNull(),
    avatarUrl: text('avatar_url'),
    isActive: boolean('is_active').notNull().default(true),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
    roleIdx: index('users_role_idx').on(t.role),
  }),
);

// ─── parent_profiles ──────────────────────────────────────────────────────────

export const parentProfiles = pgTable(
  'parent_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    religion: varchar('religion', { length: 50 }),
    incomeBracket: varchar('income_bracket', { length: 30 }),
    countryCode: varchar('country_code', { length: 3 }),
    region: varchar('region', { length: 100 }),
    languagePreference: varchar('language_preference', { length: 10 }).notNull().default('en'),
    profileVisibility: varchar('profile_visibility', { length: 20 }).notNull().default('private'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
);

// ─── child_profiles ───────────────────────────────────────────────────────────

export const childProfiles = pgTable(
  'child_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dateOfBirth: varchar('date_of_birth', { length: 10 }).notNull(), // ISO date string YYYY-MM-DD
    ageGroup: varchar('age_group', { length: 20 }).notNull(),
    screenTimeDailyLimitMinutes: integer('screen_time_daily_limit_minutes').notNull().default(120),
    isCoppaSubject: boolean('is_coppa_subject').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    parentIdx: index('child_profiles_parent_idx').on(t.parentId),
  }),
);

// ─── platform_connections ────────────────────────────────────────────────────

export const platformConnections = pgTable(
  'platform_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    platform: varchar('platform', { length: 30 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    platformUserId: varchar('platform_user_id', { length: 120 }),
    scope: text('scope'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    parentPlatformUniq: uniqueIndex('platform_connections_parent_platform_uniq').on(
      t.parentId,
      t.platform,
    ),
  }),
);

// ─── content_items ────────────────────────────────────────────────────────────

export const contentItems = pgTable(
  'content_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    platform: varchar('platform', { length: 30 }).notNull(),
    platformContentId: varchar('platform_content_id', { length: 255 }).notNull(),
    title: text('title').notNull(),
    description: text('description'),
    channelName: varchar('channel_name', { length: 255 }),
    channelId: varchar('channel_id', { length: 120 }),
    thumbnailUrl: text('thumbnail_url'),
    durationSeconds: integer('duration_seconds'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    categoryId: integer('category_id'),
    categoryLabel: varchar('category_label', { length: 100 }),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    language: varchar('language', { length: 10 }),
    contentRating: varchar('content_rating', { length: 10 }),
    ageMinRecommended: integer('age_min_recommended').notNull().default(0),
    ageMaxRecommended: integer('age_max_recommended').notNull().default(18),
    isLive: boolean('is_live').notNull().default(false),
    metadataJson: jsonb('metadata_json'),
    aiSafetyScore: real('ai_safety_score'),
    aiSafetyLabels: jsonb('ai_safety_labels'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    platformContentUniq: uniqueIndex('content_items_platform_content_id_uniq').on(
      t.platform,
      t.platformContentId,
    ),
    channelIdx: index('content_items_channel_idx').on(t.channelId),
    platformIdx: index('content_items_platform_idx').on(t.platform),
  }),
);

// ─── content_requests ────────────────────────────────────────────────────────

export const contentRequests = pgTable(
  'content_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    childNote: text('child_note'),
    parentNote: text('parent_note'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    notifySent: boolean('notify_sent').notNull().default(false),
  },
  (t) => ({
    childIdx: index('content_requests_child_idx').on(t.childId),
    parentIdx: index('content_requests_parent_idx').on(t.parentId),
    statusIdx: index('content_requests_status_idx').on(t.status),
  }),
);

// ─── approved_content ────────────────────────────────────────────────────────

export const approvedContent = pgTable(
  'approved_content',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    approvedBy: uuid('approved_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    watchCount: integer('watch_count').notNull().default(0),
    lastWatchedAt: timestamp('last_watched_at', { withTimezone: true }),
  },
  (t) => ({
    childContentUniq: uniqueIndex('approved_content_child_content_uniq').on(
      t.childId,
      t.contentId,
    ),
    childIdx: index('approved_content_child_idx').on(t.childId),
  }),
);

// ─── watch_sessions ───────────────────────────────────────────────────────────

export const watchSessions = pgTable(
  'watch_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    approvedContentId: uuid('approved_content_id').references(() => approvedContent.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    watchSeconds: integer('watch_seconds').notNull().default(0),
    deviceType: varchar('device_type', { length: 50 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    sessionData: jsonb('session_data'),
  },
  (t) => ({
    childIdx: index('watch_sessions_child_idx').on(t.childId),
    startedAtIdx: index('watch_sessions_started_at_idx').on(t.startedAt),
  }),
);

// ─── child_content_filters ───────────────────────────────────────────────────

export const childContentFilters = pgTable(
  'child_content_filters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    filterType: varchar('filter_type', { length: 50 }).notNull(),
    filterValue: text('filter_value').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childIdx: index('child_content_filters_child_idx').on(t.childId),
    typeIdx: index('child_content_filters_type_idx').on(t.filterType),
  }),
);

// ─── community_content_stats ──────────────────────────────────────────────────

export const communityContentStats = pgTable(
  'community_content_stats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    ageGroup: varchar('age_group', { length: 20 }).notNull(),
    religionBucket: varchar('religion_bucket', { length: 50 }),
    incomeBucket: varchar('income_bucket', { length: 30 }),
    region: varchar('region', { length: 100 }),
    approvalCount: integer('approval_count').notNull().default(0),
    denialCount: integer('denial_count').notNull().default(0),
    watchCount: integer('watch_count').notNull().default(0),
    avgWatchPct: real('avg_watch_pct'),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    contentAgeUniq: uniqueIndex('community_stats_content_age_uniq').on(
      t.contentId,
      t.ageGroup,
      t.religionBucket,
      t.incomeBucket,
      t.region,
    ),
    contentIdx: index('community_stats_content_idx').on(t.contentId),
    ageGroupIdx: index('community_stats_age_group_idx').on(t.ageGroup),
  }),
);

// ─── recommendations ─────────────────────────────────────────────────────────

export const recommendations = pgTable(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentId: uuid('content_id')
      .notNull()
      .references(() => contentItems.id, { onDelete: 'cascade' }),
    score: real('score').notNull(),
    reasonCode: varchar('reason_code', { length: 60 }).notNull(),
    reasonLabel: varchar('reason_label', { length: 255 }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    shownToChild: boolean('shown_to_child').notNull().default(false),
  },
  (t) => ({
    childIdx: index('recommendations_child_idx').on(t.childId),
    expiresAtIdx: index('recommendations_expires_at_idx').on(t.expiresAt),
  }),
);

// ─── notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    dataJson: jsonb('data_json'),
    isRead: boolean('is_read').notNull().default(false),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('notifications_user_idx').on(t.userId),
    isReadIdx: index('notifications_is_read_idx').on(t.isRead),
    createdAtIdx: index('notifications_created_at_idx').on(t.createdAt),
  }),
);

// ─── screen_time_schedules ────────────────────────────────────────────────────

export const screenTimeSchedules = pgTable(
  'screen_time_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    childId: uuid('child_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    dayOfWeek: smallint('day_of_week').notNull(), // 0=Sunday … 6=Saturday
    allowedStart: time('allowed_start').notNull(),
    allowedEnd: time('allowed_end').notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    childDayUniq: uniqueIndex('screen_time_schedules_child_day_uniq').on(
      t.childId,
      t.dayOfWeek,
    ),
  }),
);

// ─── audit_log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    targetType: varchar('target_type', { length: 60 }),
    targetId: uuid('target_id'),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actorIdx: index('audit_log_actor_idx').on(t.actorId),
    actionIdx: index('audit_log_action_idx').on(t.action),
    createdAtIdx: index('audit_log_created_at_idx').on(t.createdAt),
  }),
);

// ─── device_tokens ────────────────────────────────────────────────────────────

export const deviceTokens = pgTable(
  'device_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    platform: varchar('platform', { length: 20 }).notNull(), // 'ios' | 'android' | 'web'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('device_tokens_user_idx').on(t.userId),
    tokenIdx: uniqueIndex('device_tokens_token_uniq').on(t.token),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  parentProfile: one(parentProfiles, {
    fields: [users.id],
    references: [parentProfiles.userId],
  }),
  childProfile: one(childProfiles, {
    fields: [users.id],
    references: [childProfiles.userId],
    relationName: 'childUser',
  }),
  children: many(childProfiles, { relationName: 'parentChildren' }),
  platformConnections: many(platformConnections),
  contentRequestsAsParent: many(contentRequests, { relationName: 'parentRequests' }),
  contentRequestsAsChild: many(contentRequests, { relationName: 'childRequests' }),
  approvedContentAsApprover: many(approvedContent, { relationName: 'approverContent' }),
  watchSessions: many(watchSessions),
  childContentFilters: many(childContentFilters),
  notifications: many(notifications),
  deviceTokens: many(deviceTokens),
  auditLogs: many(auditLog),
}));

export const parentProfilesRelations = relations(parentProfiles, ({ one }) => ({
  user: one(users, {
    fields: [parentProfiles.userId],
    references: [users.id],
  }),
}));

export const childProfilesRelations = relations(childProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [childProfiles.userId],
    references: [users.id],
    relationName: 'childUser',
  }),
  parent: one(users, {
    fields: [childProfiles.parentId],
    references: [users.id],
    relationName: 'parentChildren',
  }),
  screenTimeSchedules: many(screenTimeSchedules),
  contentFilters: many(childContentFilters),
  recommendations: many(recommendations),
}));

export const platformConnectionsRelations = relations(platformConnections, ({ one }) => ({
  parent: one(users, {
    fields: [platformConnections.parentId],
    references: [users.id],
  }),
}));

export const contentItemsRelations = relations(contentItems, ({ many }) => ({
  contentRequests: many(contentRequests),
  approvedContent: many(approvedContent),
  watchSessions: many(watchSessions),
  recommendations: many(recommendations),
  communityStats: many(communityContentStats),
}));

export const contentRequestsRelations = relations(contentRequests, ({ one }) => ({
  child: one(users, {
    fields: [contentRequests.childId],
    references: [users.id],
    relationName: 'childRequests',
  }),
  parent: one(users, {
    fields: [contentRequests.parentId],
    references: [users.id],
    relationName: 'parentRequests',
  }),
  content: one(contentItems, {
    fields: [contentRequests.contentId],
    references: [contentItems.id],
  }),
}));

export const approvedContentRelations = relations(approvedContent, ({ one, many }) => ({
  child: one(users, {
    fields: [approvedContent.childId],
    references: [users.id],
  }),
  content: one(contentItems, {
    fields: [approvedContent.contentId],
    references: [contentItems.id],
  }),
  approver: one(users, {
    fields: [approvedContent.approvedBy],
    references: [users.id],
    relationName: 'approverContent',
  }),
  watchSessions: many(watchSessions),
}));

export const watchSessionsRelations = relations(watchSessions, ({ one }) => ({
  child: one(users, {
    fields: [watchSessions.childId],
    references: [users.id],
  }),
  content: one(contentItems, {
    fields: [watchSessions.contentId],
    references: [contentItems.id],
  }),
  approvedContent: one(approvedContent, {
    fields: [watchSessions.approvedContentId],
    references: [approvedContent.id],
  }),
}));

export const childContentFiltersRelations = relations(childContentFilters, ({ one }) => ({
  child: one(users, {
    fields: [childContentFilters.childId],
    references: [users.id],
    relationName: 'filterChild',
  }),
  createdByUser: one(users, {
    fields: [childContentFilters.createdBy],
    references: [users.id],
    relationName: 'filterCreatedBy',
  }),
}));

export const communityContentStatsRelations = relations(communityContentStats, ({ one }) => ({
  content: one(contentItems, {
    fields: [communityContentStats.contentId],
    references: [contentItems.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one }) => ({
  child: one(users, {
    fields: [recommendations.childId],
    references: [users.id],
  }),
  content: one(contentItems, {
    fields: [recommendations.contentId],
    references: [contentItems.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const screenTimeSchedulesRelations = relations(screenTimeSchedules, ({ one }) => ({
  child: one(users, {
    fields: [screenTimeSchedules.childId],
    references: [users.id],
    relationName: 'scheduleChild',
  }),
  createdByUser: one(users, {
    fields: [screenTimeSchedules.createdBy],
    references: [users.id],
    relationName: 'scheduleCreatedBy',
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, {
    fields: [auditLog.actorId],
    references: [users.id],
  }),
}));

export const deviceTokensRelations = relations(deviceTokens, ({ one }) => ({
  user: one(users, {
    fields: [deviceTokens.userId],
    references: [users.id],
  }),
}));
