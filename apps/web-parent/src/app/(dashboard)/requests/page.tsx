'use client';

import { useEffect, useState, useCallback } from 'react';
import { parentApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { clsx } from 'clsx';

type Status = 'pending' | 'approved' | 'denied' | 'all';

interface Request {
  id: string;
  childName: string;
  childAvatar: string | null;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  durationSeconds: number | null;
  aiSafetyScore: number | null;
  status: string;
  requestedAt: string;
  decidedAt: string | null;
  childNote: string | null;
  parentNote: string | null;
}

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<Status>('pending');
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyNote, setDenyNote] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const status = activeTab === 'all' ? undefined : activeTab;
      const res = await parentApi.getRequests({ status, page, limit: 15 });
      setRequests(res.data.data ?? []);
      setTotalPages(res.data.pagination?.totalPages ?? 1);
    } catch {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  // Poll for new pending requests
  useEffect(() => {
    if (activeTab !== 'pending') return;
    const interval = setInterval(() => { void fetchRequests(); }, 30000);
    return () => clearInterval(interval);
  }, [activeTab, fetchRequests]);

  const handleApprove = async (id: string) => {
    try {
      await parentApi.approveRequest(id);
      toast.success('Request approved!');
      void fetchRequests();
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleDeny = async (id: string) => {
    if (!denyNote.trim()) { toast.error('Please provide a reason'); return; }
    try {
      await parentApi.denyRequest(id, denyNote);
      setDenyingId(null);
      setDenyNote('');
      toast.success('Request denied');
      void fetchRequests();
    } catch {
      toast.error('Failed to deny');
    }
  };

  const tabs: { key: Status; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'denied', label: 'Denied' },
    { key: 'all', label: 'All' },
  ];

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Content Requests</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No {activeTab === 'all' ? '' : activeTab} requests</p>
          <p className="text-sm mt-1">Your child&apos;s content requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card p-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="w-24 h-[54px] bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {req.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.thumbnailUrl} alt={req.videoTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No image</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{req.videoTitle}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {req.channelName} {req.durationSeconds ? `· ${formatDuration(req.durationSeconds)}` : ''}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-400">
                      {req.childName} · {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}
                    </span>
                    <span className={clsx(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'approved' ? 'bg-green-100 text-green-700' :
                      req.status === 'denied' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600',
                    )}>
                      {req.status}
                    </span>
                    {req.aiSafetyScore !== null && (
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium', req.aiSafetyScore >= 0.8 ? 'bg-green-50 text-green-600' : req.aiSafetyScore >= 0.6 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')}>
                        Safety: {Math.round(req.aiSafetyScore * 100)}%
                      </span>
                    )}
                  </div>
                  {req.childNote && (
                    <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{req.childNote}&rdquo;</p>
                  )}
                </div>

                {/* Actions (pending only) */}
                {req.status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button onClick={() => handleApprove(req.id)} className="px-4 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 transition-colors">✓ Approve</button>
                    <button onClick={() => setDenyingId(req.id)} className="px-4 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors">✗ Deny</button>
                  </div>
                )}
              </div>

              {/* Deny form */}
              {denyingId === req.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Reason for denial (your child will see this)</p>
                  <textarea
                    value={denyNote}
                    onChange={(e) => setDenyNote(e.target.value)}
                    placeholder="e.g. This content is not appropriate for your age..."
                    className="w-full input resize-none text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleDeny(req.id)} className="px-4 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 transition-colors">Confirm Deny</button>
                    <button onClick={() => { setDenyingId(null); setDenyNote(''); }} className="px-4 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-50">← Prev</button>
          <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-50">Next →</button>
        </div>
      )}
    </div>
  );
}
