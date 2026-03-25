'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Video {
  id: string;
  title: string;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  platformContentId: string;
  watchCount: number;
}

interface ChildUser {
  id: string;
  displayName: string;
  role: string;
  parentId: string;
}

export default function ChildHomePage() {
  const router = useRouter();
  const [user, setUser] = useState<ChildUser | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState<Video | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('child_access_token');
    const stored = localStorage.getItem('child_user');
    if (!token || !stored) { router.replace('/child/login'); return; }
    setUser(JSON.parse(stored));

    axios.get(`${API_URL}/api/v1/child/library`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      setVideos(res.data.data ?? []);
    }).catch(() => {
      toast.error('Failed to load videos');
    }).finally(() => setLoading(false));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('child_access_token');
    localStorage.removeItem('child_user');
    router.replace('/child/login');
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-pink-100 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
            {user?.displayName[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900">Hi, {user?.displayName}! 👋</p>
            <p className="text-xs text-gray-400">Your approved videos</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-600 font-medium">
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-w-4xl mx-auto">
        {videos.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">🎬</p>
            <p className="text-lg font-semibold text-gray-700">No videos yet!</p>
            <p className="text-sm text-gray-400 mt-1">Ask your parent to add some videos for you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {videos.map((video) => (
              <button
                key={video.id}
                onClick={() => setPlaying(video)}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="relative">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
                  ) : (
                    <div className="w-full aspect-video bg-gray-100 flex items-center justify-center text-3xl">🎬</div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 text-xl ml-1">▶</span>
                    </div>
                  </div>
                  {video.durationSeconds && (
                    <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(video.durationSeconds)}
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">{video.title}</p>
                  {video.channelName && <p className="text-xs text-gray-400 mt-1 truncate">{video.channelName}</p>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Video player modal — sandboxed, no YouTube navigation */}
      {playing && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPlaying(null)}>
          <div className="bg-black rounded-2xl overflow-hidden w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
              <p className="text-white text-sm font-semibold truncate">{playing.title}</p>
              <button onClick={() => setPlaying(null)} className="text-gray-400 hover:text-white text-xl ml-4">✕</button>
            </div>
            <div className="relative" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube-nocookie.com/embed/${playing.platformContentId}?autoplay=1&rel=0&modestbranding=1`}
                title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
                allowFullScreen
              />
              {/* Block all YouTube exit links */}
              <div className="absolute top-0 left-0 right-0 h-14 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
              <div className="absolute bottom-0 right-0 w-48 h-12 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
              <div className="absolute bottom-0 left-0 w-32 h-12 z-10" style={{ pointerEvents: 'all', cursor: 'default' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
