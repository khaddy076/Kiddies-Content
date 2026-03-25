'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { parentApi } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { Search, Plus, Check, ArrowLeft } from 'lucide-react';

interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds?: number;
  description?: string;
}

export default function ContentSearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const childId = searchParams.get('childId') ?? '';

  const [query, setQuery] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [results, setResults] = useState<VideoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<'search' | 'url'>('search');
  const [childName, setChildName] = useState('');

  useEffect(() => {
    if (childId) {
      parentApi.getChild(childId)
        .then((res) => setChildName(res.data.data?.name ?? ''))
        .catch(() => {});
    }
  }, [childId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await parentApi.searchContent(query.trim(), 25);
      setResults(res.data.data ?? []);
      if ((res.data.data ?? []).length === 0) toast.info('No results found');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      const msg = error.response?.data?.error?.message;
      if (msg?.includes('not configured')) {
        toast.error('YouTube API key not configured. Use the "Add by URL" tab instead.');
        setTab('url');
      } else {
        toast.error(msg ?? 'Search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  const extractVideoId = (input: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1] ?? null;
    }
    return null;
  };

  const handleAddVideo = async (videoId: string) => {
    if (!childId) { toast.error('No child selected'); return; }
    setAdding((prev) => ({ ...prev, [videoId]: true }));
    try {
      await parentApi.preApproveContent(videoId, childId);
      setAdded((prev) => ({ ...prev, [videoId]: true }));
      toast.success('Video added to library!');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message ?? 'Failed to add video');
    } finally {
      setAdding((prev) => ({ ...prev, [videoId]: false }));
    }
  };

  const handleAddByUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoId = extractVideoId(videoUrl.trim());
    if (!videoId) { toast.error('Invalid YouTube URL or video ID'); return; }
    await handleAddVideo(videoId);
    if (!adding[videoId]) setVideoUrl('');
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={childId ? `/children/${childId}` : '/children'} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Videos</h1>
          {childName && <p className="text-sm text-gray-500">Adding to {childName}&apos;s library</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['search', 'url'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t === 'search' ? '🔍 Search YouTube' : '🔗 Add by URL'}
          </button>
        ))}
      </div>

      {/* Search tab */}
      {tab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for educational videos..."
                className="input pl-9 w-full"
              />
            </div>
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="bg-primary text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {results.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {results.map((video) => (
                <div key={video.videoId} className="flex gap-4 p-4 hover:bg-gray-50 transition-colors">
                  <img
                    src={video.thumbnailUrl}
                    alt=""
                    className="w-28 h-20 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2">{video.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{video.channelTitle}</p>
                    {video.durationSeconds && (
                      <p className="text-xs text-gray-400 mt-0.5">{formatDuration(video.durationSeconds)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAddVideo(video.videoId)}
                    disabled={adding[video.videoId] || added[video.videoId]}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold flex-shrink-0 self-center transition-colors ${
                      added[video.videoId]
                        ? 'bg-green-100 text-green-700'
                        : 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50'
                    }`}
                  >
                    {added[video.videoId] ? <><Check className="w-4 h-4" /> Added</> : adding[video.videoId] ? '...' : <><Plus className="w-4 h-4" /> Add</>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add by URL tab */}
      {tab === 'url' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Paste a YouTube video URL or video ID to add it directly to the library.
            </p>
            <form onSubmit={handleAddByUrl} className="flex gap-2">
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or video ID"
                className="input flex-1"
              />
              <button
                type="submit"
                disabled={!videoUrl.trim() || Object.values(adding).some(Boolean)}
                className="bg-primary text-white px-5 py-2 rounded-xl font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                Add to Library
              </button>
            </form>
          </div>
          <p className="text-xs text-gray-400">
            Examples: <code className="bg-gray-100 px-1 rounded">https://youtube.com/watch?v=dQw4w9WgXcQ</code> or just <code className="bg-gray-100 px-1 rounded">dQw4w9WgXcQ</code>
          </p>
        </div>
      )}
    </div>
  );
}
