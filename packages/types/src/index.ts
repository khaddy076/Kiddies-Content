// ─── Enums ─────────────────────────────────────────────────────────────────

export type UserRole = 'parent' | 'child' | 'admin';

export type AgeGroup = 'toddler' | 'preschool' | 'early-school' | 'tween' | 'teen';

export type ContentRequestStatus = 'pending' | 'approved' | 'denied' | 'expired';

export type Platform = 'youtube' | 'netflix' | 'spotify';

export type Religion =
  | 'Islam'
  | 'Christianity'
  | 'Judaism'
  | 'Hinduism'
  | 'Buddhism'
  | 'Sikhism'
  | 'Other'
  | 'None'
  | 'Prefer not to say';

export type IncomeBracket = 'lower' | 'middle' | 'upper-middle' | 'upper';

export type NotificationType =
  | 'content_request'
  | 'request_approved'
  | 'request_denied'
  | 'screen_time_warning'
  | 'screen_time_exceeded'
  | 'weekly_summary'
  | 'new_recommendation';

export type FilterType =
  | 'block_category'
  | 'block_channel'
  | 'block_tag'
  | 'require_min_rating';

export type ProfileVisibility = 'private' | 'community' | 'public';

export type ContentRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NR';

export type RecommendationReason =
  | 'community_similar_parents'
  | 'trending_age_group'
  | 'parent_channel_preference'
  | 'category_preference'
  | 'global_trending';

// ─── Core Entities ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  role: UserRole;
  email: string | null;
  phone: string | null;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ParentProfile {
  id: string;
  userId: string;
  religion: Religion | null;
  incomeBracket: IncomeBracket | null;
  countryCode: string | null;
  region: string | null;
  languagePreference: string;
  profileVisibility: ProfileVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface ChildProfile {
  id: string;
  userId: string;
  parentId: string;
  dateOfBirth: string;
  ageGroup: AgeGroup;
  screenTimeDailyLimitMinutes: number;
  isCoppaSubject: boolean;
  createdAt: string;
}

export interface ContentItem {
  id: string;
  platform: Platform;
  platformContentId: string;
  title: string;
  description: string | null;
  channelName: string | null;
  channelId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  categoryId: number | null;
  categoryLabel: string | null;
  tags: string[];
  language: string | null;
  contentRating: ContentRating | null;
  ageMinRecommended: number;
  ageMaxRecommended: number;
  isLive: boolean;
  aiSafetyScore: number | null;
  aiSafetyLabels: AiSafetyLabels | null;
  fetchedAt: string;
}

export interface AiSafetyLabels {
  violence: number;
  language: number;
  sexualContent: number;
  spam: number;
  overall: number;
}

export interface ContentRequest {
  id: string;
  childId: string;
  parentId: string;
  contentId: string;
  status: ContentRequestStatus;
  childNote: string | null;
  parentNote: string | null;
  requestedAt: string;
  decidedAt: string | null;
  expiresAt: string;
  notifySent: boolean;
  content?: ContentItem;
  child?: Pick<User, 'id' | 'displayName' | 'avatarUrl'>;
}

export interface ApprovedContent {
  id: string;
  childId: string;
  contentId: string;
  approvedBy: string;
  approvedAt: string;
  expiresAt: string | null;
  watchCount: number;
  lastWatchedAt: string | null;
  content?: ContentItem;
}

export interface WatchSession {
  id: string;
  childId: string;
  contentId: string;
  approvedContentId: string | null;
  startedAt: string;
  endedAt: string | null;
  watchSeconds: number;
  deviceType: string | null;
}

export interface ChildContentFilter {
  id: string;
  childId: string;
  filterType: FilterType;
  filterValue: string;
  createdBy: string;
  createdAt: string;
}

export interface ScreenTimeSchedule {
  id: string;
  childId: string;
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  allowedStart: string; // HH:MM
  allowedEnd: string;   // HH:MM
  createdBy: string;
}

export interface Recommendation {
  id: string;
  childId: string;
  contentId: string;
  score: number;
  reasonCode: RecommendationReason;
  reasonLabel: string | null;
  generatedAt: string;
  expiresAt: string;
  shownToChild: boolean;
  content?: ContentItem;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  dataJson: Record<string, unknown> | null;
  isRead: boolean;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface PlatformConnection {
  id: string;
  parentId: string;
  platform: Platform;
  platformUserId: string | null;
  scope: string | null;
  isActive: boolean;
  createdAt: string;
}

// ─── API Request/Response types ─────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── Auth types ─────────────────────────────────────────────────────────────

export interface RegisterParentRequest {
  email: string;
  password: string;
  displayName: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChildLoginRequest {
  parentEmail: string;
  childId: string;
  pin: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string; // user id
  role: UserRole;
  iat: number;
  exp: number;
}

// ─── YouTube types ──────────────────────────────────────────────────────────

export interface YouTubeVideoMetadata {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  publishedAt: string;
  categoryId: string;
  tags: string[];
  contentRating: Record<string, string>;
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  isLive: boolean;
  language: string | null;
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  isLive: boolean;
}

// ─── Screen time ─────────────────────────────────────────────────────────────

export interface ScreenTimeSummary {
  childId: string;
  date: string;
  usedMinutes: number;
  limitMinutes: number;
  remainingMinutes: number;
  isWithinSchedule: boolean;
  sessions: Array<{
    contentTitle: string;
    durationMinutes: number;
    startedAt: string;
  }>;
}

// ─── Community / Recommendations ────────────────────────────────────────────

export interface CommunityStats {
  contentId: string;
  ageGroup: AgeGroup;
  approvalCount: number;
  denialCount: number;
  watchCount: number;
  avgWatchPct: number;
}

export interface RecommendationRequest {
  childId: string;
  limit?: number;
  includeReasons?: boolean;
}
