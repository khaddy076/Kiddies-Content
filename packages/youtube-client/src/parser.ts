import type {
  YouTubeVideoResource,
  YouTubeSearchResource,
  YouTubeChannelResource,
  SafeVideoMetadata,
  SafeSearchResult,
  SafeChannelInfo,
  VideoSafetyAssessment,
} from './types.js';

// ─── Duration parser ────────────────────────────────────────────────────────

/**
 * Converts ISO 8601 duration string (e.g. "PT1H2M3S") to total seconds.
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(
    /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/,
  );
  if (!match) return 0;

  const [, , , weeks, days, hours, minutes, seconds] = match;
  return (
    (parseInt(weeks ?? '0') * 7 * 24 * 60 * 60) +
    (parseInt(days ?? '0') * 24 * 60 * 60) +
    (parseInt(hours ?? '0') * 60 * 60) +
    (parseInt(minutes ?? '0') * 60) +
    parseInt(seconds ?? '0')
  );
}

// ─── Thumbnail helper ────────────────────────────────────────────────────────

function getBestThumbnail(thumbnails: YouTubeVideoResource['snippet']['thumbnails']): string {
  return (
    thumbnails.maxres?.url ??
    thumbnails.standard?.url ??
    thumbnails.high?.url ??
    thumbnails.medium?.url ??
    thumbnails.default?.url ??
    ''
  );
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function mapVideoToSafeMetadata(video: YouTubeVideoResource): SafeVideoMetadata {
  return {
    videoId: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    channelId: video.snippet.channelId,
    channelTitle: video.snippet.channelTitle,
    thumbnailUrl: getBestThumbnail(video.snippet.thumbnails),
    durationSeconds: parseDuration(video.contentDetails.duration),
    publishedAt: video.snippet.publishedAt,
    categoryId: video.snippet.categoryId,
    tags: video.snippet.tags ?? [],
    contentRating: Object.fromEntries(
      Object.entries(video.contentDetails.contentRating).filter(
        ([, v]) => v !== undefined,
      ) as [string, string][],
    ),
    statistics: {
      viewCount: video.statistics.viewCount ?? '0',
      likeCount: video.statistics.likeCount ?? '0',
      commentCount: video.statistics.commentCount ?? '0',
    },
    isLive: video.snippet.liveBroadcastContent === 'live',
    madeForKids: video.status.madeForKids,
    embeddable: video.status.embeddable,
    language: video.snippet.defaultLanguage ?? null,
    defaultAudioLanguage: video.snippet.defaultAudioLanguage ?? null,
  };
}

export function mapSearchResultToSafe(item: YouTubeSearchResource): SafeSearchResult {
  const thumbnails = item.snippet.thumbnails;
  return {
    videoId: item.id.videoId ?? '',
    title: item.snippet.title,
    description: item.snippet.description,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    thumbnailUrl:
      thumbnails.high?.url ??
      thumbnails.medium?.url ??
      thumbnails.default?.url ??
      '',
    publishedAt: item.snippet.publishedAt,
    isLive: item.snippet.liveBroadcastContent === 'live',
  };
}

export function mapChannelToSafe(channel: YouTubeChannelResource): SafeChannelInfo {
  return {
    channelId: channel.id,
    title: channel.snippet.title,
    description: channel.snippet.description,
    thumbnailUrl:
      channel.snippet.thumbnails.high?.url ??
      channel.snippet.thumbnails.medium?.url ??
      channel.snippet.thumbnails.default?.url ??
      '',
    subscriberCount: channel.statistics.subscriberCount ?? '0',
    videoCount: channel.statistics.videoCount ?? '0',
    country: channel.snippet.country ?? null,
  };
}

// ─── Safety assessment ────────────────────────────────────────────────────────

const VIOLENCE_KEYWORDS = [
  'kill', 'murder', 'dead', 'death', 'gore', 'blood', 'shoot', 'gun', 'weapon',
  'fight', 'war', 'bomb', 'explosion', 'attack', 'hurt', 'brutal',
];

const ADULT_KEYWORDS = [
  'sex', 'nude', 'naked', 'adult', 'porn', 'xxx', 'explicit', 'nsfw',
  'erotic', 'mature content',
];

const LANGUAGE_KEYWORDS = [
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell', 'crap', 'bastard',
  'idiot', 'stupid', 'moron', 'freak',
];

const SPAM_KEYWORDS = [
  'click here', 'subscribe now', 'buy now', 'free money', 'make money fast',
  'get rich', 'weight loss', 'discount code', 'promo code',
];

// Kids-friendly category IDs (YouTube category IDs)
const KIDS_FRIENDLY_CATEGORIES = new Set([
  '1',  // Film & Animation
  '2',  // Autos & Vehicles - borderline
  '10', // Music
  '15', // Pets & Animals
  '17', // Sports
  '19', // Travel & Events
  '20', // Gaming
  '21', // Videoblogging
  '22', // People & Blogs
  '23', // Comedy
  '24', // Entertainment
  '25', // News & Politics - borderline
  '26', // Howto & Style
  '27', // Education
  '28', // Science & Technology
  '29', // Nonprofits & Activism
]);

function scoreKeywords(text: string, keywords: string[]): number {
  const lowerText = text.toLowerCase();
  const hits = keywords.filter((kw) => lowerText.includes(kw)).length;
  return Math.min(hits / 3, 1.0);
}

/**
 * Heuristic safety scoring. Returns 0.0 (unsafe) to 1.0 (very safe).
 * A real implementation would use Google Cloud Video Intelligence API on
 * the actual video frames. This heuristic uses metadata signals.
 */
export function assessVideoSafety(video: SafeVideoMetadata): VideoSafetyAssessment {
  const textToAnalyze = `${video.title} ${video.description} ${video.tags.join(' ')}`;

  const violenceScore = scoreKeywords(textToAnalyze, VIOLENCE_KEYWORDS);
  const adultScore = scoreKeywords(textToAnalyze, ADULT_KEYWORDS);
  const languageScore = scoreKeywords(textToAnalyze, LANGUAGE_KEYWORDS);
  const spamScore = scoreKeywords(textToAnalyze, SPAM_KEYWORDS);

  const reasons: string[] = [];

  // Content rating flags
  const hasExplicitRating =
    video.contentRating['ytRating'] === 'ytAgeRestricted' ||
    video.contentRating['mpaaRating'] === 'mpaaR' ||
    video.contentRating['mpaaRating'] === 'mpaaNC17';

  if (hasExplicitRating) {
    adultScore > 0 || reasons.push('Age-restricted content rating');
  }
  if (violenceScore > 0.3) reasons.push('Potential violent content detected in metadata');
  if (adultScore > 0.3) reasons.push('Potential adult content detected in metadata');
  if (languageScore > 0.3) reasons.push('Potential profanity detected in metadata');
  if (spamScore > 0.3) reasons.push('Potential spam/commercial content');
  if (!video.embeddable) reasons.push('Video is not embeddable');
  if (video.isLive) reasons.push('Live stream content');

  // Base safety score (higher = safer)
  let safetyScore = 1.0;
  safetyScore -= violenceScore * 0.4;
  safetyScore -= adultScore * 0.5;
  safetyScore -= languageScore * 0.3;
  safetyScore -= spamScore * 0.1;
  if (hasExplicitRating) safetyScore -= 0.5;
  if (!video.embeddable) safetyScore -= 0.3;

  // Boost for madeForKids flag
  if (video.madeForKids) safetyScore = Math.min(safetyScore + 0.2, 1.0);

  // Boost for kids-friendly category
  if (KIDS_FRIENDLY_CATEGORIES.has(video.categoryId)) {
    safetyScore = Math.min(safetyScore + 0.1, 1.0);
  }

  const finalScore = Math.max(0, Math.min(1.0, safetyScore));

  return {
    isSafe: finalScore >= 0.7 && !hasExplicitRating && !video.isLive,
    score: finalScore,
    reasons,
    violenceScore,
    languageScore,
    spamScore,
    adultScore,
    madeForKids: video.madeForKids,
  };
}
