// ─── YouTube Data API v3 raw resource types ────────────────────────────────

export interface YouTubeApiConfig {
  apiKey: string;
  maxResults?: number;
  safeSearch?: 'none' | 'moderate' | 'strict';
  regionCode?: string;
  defaultLanguage?: string;
}

export interface YouTubeThumbnails {
  default?: { url: string; width: number; height: number };
  medium?: { url: string; width: number; height: number };
  high?: { url: string; width: number; height: number };
  standard?: { url: string; width: number; height: number };
  maxres?: { url: string; width: number; height: number };
}

export interface YouTubeVideoSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  tags?: string[];
  categoryId: string;
  liveBroadcastContent: 'none' | 'upcoming' | 'live';
  defaultLanguage?: string;
  defaultAudioLanguage?: string;
}

export interface YouTubeVideoContentDetails {
  duration: string; // ISO 8601 e.g. PT1H2M3S
  dimension: string;
  definition: string;
  caption: string;
  licensedContent: boolean;
  contentRating: {
    ytRating?: string;
    mpaaRating?: string;
    tvpgRating?: string;
    [key: string]: string | undefined;
  };
  projection: string;
}

export interface YouTubeVideoStatistics {
  viewCount?: string;
  likeCount?: string;
  dislikeCount?: string;
  favoriteCount?: string;
  commentCount?: string;
}

export interface YouTubeVideoStatus {
  uploadStatus: string;
  privacyStatus: 'public' | 'unlisted' | 'private';
  license: string;
  embeddable: boolean;
  publicStatsViewable: boolean;
  madeForKids: boolean;
  selfDeclaredMadeForKids?: boolean;
}

export interface YouTubeVideoResource {
  kind: 'youtube#video';
  etag: string;
  id: string;
  snippet: YouTubeVideoSnippet;
  contentDetails: YouTubeVideoContentDetails;
  statistics: YouTubeVideoStatistics;
  status: YouTubeVideoStatus;
}

export interface YouTubeSearchSnippet {
  publishedAt: string;
  channelId: string;
  title: string;
  description: string;
  thumbnails: YouTubeThumbnails;
  channelTitle: string;
  liveBroadcastContent: 'none' | 'upcoming' | 'live';
}

export interface YouTubeSearchResource {
  kind: 'youtube#searchResult';
  etag: string;
  id: {
    kind: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: YouTubeSearchSnippet;
}

export interface YouTubeChannelSnippet {
  title: string;
  description: string;
  publishedAt: string;
  thumbnails: YouTubeThumbnails;
  country?: string;
  defaultLanguage?: string;
}

export interface YouTubeChannelStatistics {
  viewCount?: string;
  subscriberCount?: string;
  hiddenSubscriberCount?: boolean;
  videoCount?: string;
}

export interface YouTubeChannelResource {
  kind: 'youtube#channel';
  etag: string;
  id: string;
  snippet: YouTubeChannelSnippet;
  statistics: YouTubeChannelStatistics;
}

export interface YouTubeVideoCategory {
  kind: 'youtube#videoCategory';
  etag: string;
  id: string;
  snippet: {
    title: string;
    assignable: boolean;
    channelId: string;
  };
}

export interface YouTubeApiListResponse<T> {
  kind: string;
  etag: string;
  nextPageToken?: string;
  prevPageToken?: string;
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  items: T[];
}

// ─── Safe / mapped types for our app ────────────────────────────────────────

export interface SafeVideoMetadata {
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
  madeForKids: boolean;
  embeddable: boolean;
  language: string | null;
  defaultAudioLanguage: string | null;
}

export interface SafeSearchResult {
  videoId: string;
  title: string;
  description: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  publishedAt: string;
  isLive: boolean;
}

export interface SafeChannelInfo {
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: string;
  videoCount: string;
  country: string | null;
}

export interface VideoSafetyAssessment {
  isSafe: boolean;
  score: number; // 0.0 = unsafe, 1.0 = very safe
  reasons: string[];
  violenceScore: number;
  languageScore: number;
  spamScore: number;
  adultScore: number;
  madeForKids: boolean;
}

export interface SearchOptions {
  maxResults?: number;
  pageToken?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  type?: 'video' | 'channel' | 'playlist';
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount';
  publishedAfter?: string;
  publishedBefore?: string;
  videoEmbeddable?: boolean;
  safeSearch?: 'strict' | 'moderate'; // always defaults to strict
}
