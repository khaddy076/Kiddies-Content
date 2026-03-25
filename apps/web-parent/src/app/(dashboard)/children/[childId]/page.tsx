'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { parentApi } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';

interface ChildDetail {
  id: string;
  name: string;
  ageGroup: string;
  screenTimeLimitMinutes: number;
  isActive: boolean;
  isPaused: boolean;
}

interface ScreenTimeData {
  todayMinutes: number;
  limitMinutes: number;
  percentage: number;
  weeklyMinutes: number;
}

interface LibraryItem {
  id: string;
  title: string;
  videoTitle?: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  watchCount: number;
  approvedAt: string;
  platformContentId: string;
}

export default function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const router = useRouter();
  const [child, setChild] = useState<ChildDetail | null>(null);
  const [screenTime, setScreenTime] = useState<ScreenTimeData | null>(null);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pausing, setPausing] = useState(false);
  const [activeTab, setActiveTab] = useState<'library' | 'screentime'>('library');
  const [playingVideo, setPlayingVideo] = useState<LibraryItem | null>(null);

  useEffect(() => {
    if (!childId) return;
    Promise.all([
      parentApi.getChild(childId),
      parentApi.getChildScreenTime(childId),
      parentApi.getChildLibrary(childId, { limit: 50 }),
    ])
      .then(([childRes, stRes, libRes]) => {
        setChild(childRes.data.data);
        setScreenTime(stRes.data.data);
        setLibrary(libRes.data.data ?? []);
      })
      .catch(() => toast.error('Failed to load child data'))
      .finally(() => setLoading(false));
  }, [childId]);

  const handleTogglePause = async () => {
    if (!child) return;
    setPausing(true);
    try {
      await parentApi.updateChild(child.id, { isPaused: !child.isPaused });
      setChild((prev) => prev ? { ...prev, isPaused: !prev.isPaused } : prev);
      toast.success(child.isPaused ? 'Screen time resumed' : 'Screen time paused');
    } catch {
      toast.error('Failed to update');
    } finally {
      setPausing(false);
    }
  };

  const handleRemoveFromLibrary = async (item: LibraryItem) => {
    if (!child || !confirm(`Remove "${item.videoTitle}" from ${child.name}'s library?`)) return;
    try {
      await parentApi.removeFromLibrary(child.id, item.id);
      setLibrary((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Removed from library');
    } catch {
      toast.error('Failed to remove');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Child not found</p>
        <Link href="/children" className="text-indigo-600 text-sm mt-2 inline-block">← Back to children</Link>
      </div>
    );
  }

  const stPct = screenTime ? Math.min(screenTime.percentage, 100) : 0;
  const barColor = stPct >= 90 ? '#EF4444' : stPct >= 70 ? '#F59E0B' : '#10B981';
  const initials = child.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Back */}
      <div>
        <Link href="/children" className="text-indigo-600 text-sm font-medium hover:underline">← All children</Link>
      </div>

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
              {child.isPaused && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                  ⏸ Paused
                </span>
              )}
              <span className={`px-3 py-1 text-xs font-semibold rounded-full ${child.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {child.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {child.ageGroup.replace('_', '–')} years · {child.screenTimeLimitMinutes}min/day limit
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleTogglePause}
              disabled={pausing}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                child.isPaused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              } disabled:opacity-50`}
            >
              {pausing ? '...' : child.isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <Link
              href={`/content/search?childId=${child.id}`}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              + Add Videos
            </Link>
          </div>
        </div>

        {/* Screen time bar */}
        {screenTime && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">Today's screen time</span>
              <span className="font-semibold text-gray-900">
                {screenTime.todayMinutes}m / {screenTime.limitMinutes}m
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${stPct}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['library', 'screentime'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'library' ? `📚 Library (${library.length})` : '⏱ Screen Time'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'library' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {library.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-4">📚</p>
              <p className="font-semibold text-gray-900">No approved videos yet</p>
              <p className="text-sm text-gray-500 mt-1">Approve requests or add videos directly</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {library.map((item) => {
                const title = item.title || item.videoTitle || 'Untitled Video';
                return (
                  <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <button onClick={() => setPlayingVideo(item)} className="relative flex-shrink-0 group">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt="" className="w-20 h-14 object-cover rounded-lg" />
                      ) : (
                        <div className="w-20 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">🎬</div>
                      )}
                      <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-xl">▶</span>
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
                      <p className="text-xs text-gray-500">{item.channelName}</p>
                      {item.watchCount > 0 && (
                        <p className="text-xs text-indigo-600 mt-0.5">▶ Watched {item.watchCount}×</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setPlayingVideo(item)}
                        className="text-indigo-500 hover:text-indigo-700 text-sm font-medium transition-colors"
                      >
                        ▶ Play
                      </button>
                      <span className="text-gray-200">|</span>
                      <button
                        onClick={() => handleRemoveFromLibrary(item)}
                        className="text-red-400 hover:text-red-600 text-sm font-medium transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'screentime' && screenTime && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">Today</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{screenTime.todayMinutes}m</p>
            <p className="text-sm text-gray-400">of {screenTime.limitMinutes}m limit</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <p className="text-sm font-medium text-gray-500">This week</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{screenTime.weeklyMinutes ?? 0}m</p>
            <p className="text-sm text-gray-400">total screen time</p>
          </div>
        </div>
      )}
      {/* Video player modal */}
      {playingVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setPlayingVideo(null)}>
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <p className="text-white text-sm font-semibold truncate">{playingVideo.title || playingVideo.videoTitle}</p>
              <button onClick={() => setPlayingVideo(null)} className="text-gray-400 hover:text-white text-xl ml-4">✕</button>
            </div>
            <div className="relative" style={{ paddingTop: '56.25%' }}>
              {/* Sandboxed iframe — no top-navigation allowed, prevents leaving the platform */}
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${playingVideo.platformContentId}?autoplay=1&rel=0&modestbranding=1&disablekb=0`}
                title={playingVideo.title || playingVideo.videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                allowFullScreen
              />
              {/* Block all YouTube exit points */}
              {/* Top bar — "Watch on YouTube" title link */}
              <div className="absolute top-0 left-0 right-0 h-14 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
              {/* Bottom-right — YouTube logo & "Watch on YouTube" button */}
              <div className="absolute bottom-0 right-0 w-48 h-12 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
              {/* Bottom-left — YouTube watermark */}
              <div className="absolute bottom-0 left-0 w-32 h-12 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
