import axios, { type AxiosInstance } from 'axios';
import {
  mapVideoToSafeMetadata,
  mapSearchResultToSafe,
  mapChannelToSafe,
  assessVideoSafety,
} from './parser.js';
import type {
  YouTubeApiConfig,
  YouTubeVideoResource,
  YouTubeSearchResource,
  YouTubeChannelResource,
  YouTubeVideoCategory,
  YouTubeApiListResponse,
  SafeVideoMetadata,
  SafeSearchResult,
  SafeChannelInfo,
  VideoSafetyAssessment,
  SearchOptions,
} from './types.js';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class YouTubeClient {
  private readonly http: AxiosInstance;
  private readonly config: Required<YouTubeApiConfig>;
  private readonly cache = new Map<string, CacheEntry<unknown>>();

  constructor(config: YouTubeApiConfig) {
    this.config = {
      apiKey: config.apiKey,
      maxResults: config.maxResults ?? 25,
      safeSearch: 'strict', // ALWAYS strict – override ignored
      regionCode: config.regionCode ?? 'US',
      defaultLanguage: config.defaultLanguage ?? 'en',
    };

    this.http = axios.create({
      baseURL: YOUTUBE_API_BASE,
      timeout: 10_000,
      params: { key: this.config.apiKey },
    });

    // Retry on 5xx
    this.http.interceptors.response.use(undefined, async (error) => {
      const status = error.response?.status as number | undefined;
      const retries = (error.config._retries as number | undefined) ?? 0;
      if (status && status >= 500 && retries < 3) {
        error.config._retries = retries + 1;
        await new Promise((r) => setTimeout(r, 2 ** retries * 500));
        return this.http.request(error.config);
      }
      return Promise.reject(error);
    });
  }

  // ─── Cache helpers ──────────────────────────────────────────────────────

  private cacheGet<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private cacheSet<T>(key: string, data: T): void {
    this.cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  // ─── Search ────────────────────────────────────────────────────────────

  async searchVideos(query: string, options: SearchOptions = {}): Promise<SafeSearchResult[]> {
    const cacheKey = `search:${query}:${JSON.stringify(options)}`;
    const cached = this.cacheGet<SafeSearchResult[]>(cacheKey);
    if (cached) return cached;

    const params = {
      part: 'snippet',
      q: query,
      type: 'video',
      safeSearch: 'strict', // always strict
      videoEmbeddable: options.videoEmbeddable ?? true,
      maxResults: options.maxResults ?? this.config.maxResults,
      regionCode: options.regionCode ?? this.config.regionCode,
      relevanceLanguage: options.relevanceLanguage ?? this.config.defaultLanguage,
      order: options.order ?? 'relevance',
      ...(options.pageToken ? { pageToken: options.pageToken } : {}),
      ...(options.publishedAfter ? { publishedAfter: options.publishedAfter } : {}),
      ...(options.publishedBefore ? { publishedBefore: options.publishedBefore } : {}),
    };

    const response = await this.http.get<YouTubeApiListResponse<YouTubeSearchResource>>(
      '/search',
      { params },
    );

    const results = response.data.items
      .filter((item) => item.id.videoId && item.snippet.liveBroadcastContent !== 'live')
      .map(mapSearchResultToSafe);

    this.cacheSet(cacheKey, results);
    return results;
  }

  // ─── Video metadata ────────────────────────────────────────────────────

  async getVideo(videoId: string): Promise<SafeVideoMetadata | null> {
    const cacheKey = `video:${videoId}`;
    const cached = this.cacheGet<SafeVideoMetadata>(cacheKey);
    if (cached) return cached;

    const response = await this.http.get<YouTubeApiListResponse<YouTubeVideoResource>>(
      '/videos',
      {
        params: {
          part: 'snippet,contentDetails,statistics,status',
          id: videoId,
        },
      },
    );

    const video = response.data.items[0];
    if (!video) return null;

    if (!video.status.embeddable || video.status.privacyStatus !== 'public') return null;

    const mapped = mapVideoToSafeMetadata(video);
    this.cacheSet(cacheKey, mapped);
    return mapped;
  }

  async getVideos(videoIds: string[]): Promise<SafeVideoMetadata[]> {
    if (videoIds.length === 0) return [];

    // Batch requests up to 50 at a time
    const batches: string[][] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      batches.push(videoIds.slice(i, i + 50));
    }

    const results: SafeVideoMetadata[] = [];
    for (const batch of batches) {
      const response = await this.http.get<YouTubeApiListResponse<YouTubeVideoResource>>(
        '/videos',
        {
          params: {
            part: 'snippet,contentDetails,statistics,status',
            id: batch.join(','),
          },
        },
      );
      const mapped = response.data.items
        .filter((v) => v.status.embeddable && v.status.privacyStatus === 'public')
        .map(mapVideoToSafeMetadata);
      results.push(...mapped);
    }

    return results;
  }

  // ─── Channel ───────────────────────────────────────────────────────────

  async getChannel(channelId: string): Promise<SafeChannelInfo | null> {
    const cacheKey = `channel:${channelId}`;
    const cached = this.cacheGet<SafeChannelInfo>(cacheKey);
    if (cached) return cached;

    const response = await this.http.get<YouTubeApiListResponse<YouTubeChannelResource>>(
      '/channels',
      {
        params: {
          part: 'snippet,statistics',
          id: channelId,
        },
      },
    );

    const channel = response.data.items[0];
    if (!channel) return null;

    const mapped = mapChannelToSafe(channel);
    this.cacheSet(cacheKey, mapped);
    return mapped;
  }

  async getChannelVideos(channelId: string, maxResults = 25): Promise<SafeSearchResult[]> {
    const cacheKey = `channel_videos:${channelId}:${maxResults}`;
    const cached = this.cacheGet<SafeSearchResult[]>(cacheKey);
    if (cached) return cached;

    const response = await this.http.get<YouTubeApiListResponse<YouTubeSearchResource>>(
      '/search',
      {
        params: {
          part: 'snippet',
          channelId,
          type: 'video',
          safeSearch: 'strict',
          videoEmbeddable: true,
          maxResults,
          order: 'date',
        },
      },
    );

    const results = response.data.items
      .filter((item) => item.id.videoId && item.snippet.liveBroadcastContent !== 'live')
      .map(mapSearchResultToSafe);

    this.cacheSet(cacheKey, results);
    return results;
  }

  // ─── Categories ────────────────────────────────────────────────────────

  async getVideoCategories(regionCode?: string): Promise<YouTubeVideoCategory[]> {
    const region = regionCode ?? this.config.regionCode;
    const cacheKey = `categories:${region}`;
    const cached = this.cacheGet<YouTubeVideoCategory[]>(cacheKey);
    if (cached) return cached;

    const response = await this.http.get<YouTubeApiListResponse<YouTubeVideoCategory>>(
      '/videoCategories',
      {
        params: {
          part: 'snippet',
          regionCode: region,
          hl: this.config.defaultLanguage,
        },
      },
    );

    const categories = response.data.items.filter((c) => c.snippet.assignable);
    this.cacheSet(cacheKey, categories);
    return categories;
  }

  // ─── Safety ────────────────────────────────────────────────────────────

  async assessContentSafety(videoId: string): Promise<VideoSafetyAssessment> {
    const video = await this.getVideo(videoId);
    if (!video) {
      return {
        isSafe: false,
        score: 0,
        reasons: ['Video not found or not embeddable'],
        violenceScore: 0,
        languageScore: 0,
        spamScore: 0,
        adultScore: 0,
        madeForKids: false,
      };
    }
    return assessVideoSafety(video);
  }

  // ─── Trending ──────────────────────────────────────────────────────────

  async getTrending(categoryId?: number, regionCode?: string): Promise<SafeVideoMetadata[]> {
    const region = regionCode ?? this.config.regionCode;
    const cacheKey = `trending:${region}:${categoryId ?? 'all'}`;
    const cached = this.cacheGet<SafeVideoMetadata[]>(cacheKey);
    if (cached) return cached;

    const params: Record<string, string | number | boolean> = {
      part: 'snippet,contentDetails,statistics,status',
      chart: 'mostPopular',
      regionCode: region,
      maxResults: 50,
    };

    if (categoryId) {
      params['videoCategoryId'] = categoryId;
    }

    const response = await this.http.get<YouTubeApiListResponse<YouTubeVideoResource>>(
      '/videos',
      { params },
    );

    const results = response.data.items
      .filter((v) => v.status.embeddable && v.status.privacyStatus === 'public')
      .map(mapVideoToSafeMetadata)
      .filter((v) => {
        const safety = assessVideoSafety(v);
        return safety.score >= 0.7;
      });

    this.cacheSet(cacheKey, results);
    return results;
  }

  // ─── Cache management ──────────────────────────────────────────────────

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
