'use client';

import { useEffect, useState } from 'react';
import { parentApi } from '@/lib/api';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface Child { id: string; displayName: string; }
interface Recommendation {
  id: string;
  contentId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
  durationSeconds: number;
  aiSafetyScore: number | null;
  score: number;
  reasonLabel: string;
}

export default function RecommendationsPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    parentApi.getChildren().then((res) => {
      const kids: Child[] = res.data.data ?? [];
      setChildren(kids);
      if (kids[0]) setSelectedChild(kids[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedChild) return;
    setLoading(true);
    parentApi.getRecommendations(selectedChild)
      .then((res) => setRecommendations(res.data.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedChild]);

  const handleApprove = async (rec: Recommendation) => {
    setApproving(rec.contentId);
    try {
      await parentApi.preApproveContent(rec.contentId, selectedChild);
      toast.success(`"${rec.title}" added to library`);
      setRecommendations((prev) => prev.filter((r) => r.contentId !== rec.contentId));
    } catch {
      toast.error('Failed to approve');
    } finally {
      setApproving(null);
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const childName = children.find((c) => c.id === selectedChild)?.displayName;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recommendations</h1>
          <p className="text-gray-500 text-sm mt-1">Content suggested based on parents with similar values</p>
        </div>
        <button onClick={() => { if (selectedChild) { setLoading(true); parentApi.getRecommendations(selectedChild).then((res) => setRecommendations(res.data.data ?? [])).catch(() => {}).finally(() => setLoading(false)); } }} className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2">
          {children.map((child) => (
            <button key={child.id} onClick={() => setSelectedChild(child.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${selectedChild === child.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {child.displayName}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No recommendations yet</p>
          <p className="text-sm mt-1">Recommendations will appear as the community grows and you approve more content</p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-4">{recommendations.length} recommendations for {childName}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="card overflow-hidden">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={rec.thumbnailUrl} alt={rec.title} className="w-full aspect-video object-cover" />
                  {rec.durationSeconds > 0 && (
                    <span className="absolute bottom-1 right-1 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded">
                      {formatDuration(rec.durationSeconds)}
                    </span>
                  )}
                  {rec.aiSafetyScore !== null && (
                    <span className={`absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded font-medium ${rec.aiSafetyScore >= 0.8 ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
                      {Math.round(rec.aiSafetyScore * 100)}% safe
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{rec.title}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.channelName}</p>
                  <p className="text-xs text-primary mt-1">💡 {rec.reasonLabel}</p>
                  <button
                    onClick={() => handleApprove(rec)}
                    disabled={approving === rec.contentId}
                    className="w-full mt-3 bg-primary text-white py-1.5 rounded-lg text-xs font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
                  >
                    {approving === rec.contentId ? 'Adding...' : `✓ Add to ${childName}'s Library`}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
