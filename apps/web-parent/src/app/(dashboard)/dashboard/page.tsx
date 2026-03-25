'use client';

import { useEffect, useState } from 'react';
import { parentApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Users, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Child {
  id: string;
  displayName: string;
  ageGroup: string;
  screenTimeDailyLimitMinutes: number;
  todayScreenTimeMinutes: number;
}

interface Request {
  id: string;
  childName: string;
  videoTitle: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  status: string;
  requestedAt: string;
}

export default function DashboardPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      parentApi.getChildren(),
      parentApi.getRequests({ status: 'pending', limit: 5 }),
    ]).then(([childRes, reqRes]) => {
      setChildren(childRes.data.data ?? []);
      setRequests(reqRes.data.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleApprove = async (requestId: string) => {
    try {
      await parentApi.approveRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('Request approved!');
    } catch {
      toast.error('Failed to approve');
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      await parentApi.denyRequest(requestId, 'Not appropriate at this time');
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success('Request denied');
    } catch {
      toast.error('Failed to deny');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const totalScreenTime = children.reduce((sum, c) => sum + (c.todayScreenTimeMinutes ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of your family's content activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{requests.length}</div>
            <div className="text-sm text-gray-500">Pending Requests</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{children.length}</div>
            <div className="text-sm text-gray-500">Children</div>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalScreenTime}m</div>
            <div className="text-sm text-gray-500">Today&apos;s Screen Time</div>
          </div>
        </div>
      </div>

      {/* Screen time per child */}
      {children.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Screen Time Today</h2>
          <div className="space-y-3">
            {children.map((child) => {
              const pct = child.screenTimeDailyLimitMinutes > 0
                ? Math.min((child.todayScreenTimeMinutes / child.screenTimeDailyLimitMinutes) * 100, 100)
                : 0;
              const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
              return (
                <div key={child.id}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-700">{child.displayName}</span>
                    <span className="text-xs text-gray-500">{child.todayScreenTimeMinutes}m / {child.screenTimeDailyLimitMinutes}m</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending requests */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Pending Requests</h2>
          <a href="/requests" className="text-sm text-primary hover:underline">View all</a>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-16 h-12 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                  {req.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={req.thumbnailUrl} alt={req.videoTitle} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.videoTitle}</p>
                  <p className="text-xs text-gray-500">{req.childName} · {formatDistanceToNow(new Date(req.requestedAt), { addSuffix: true })}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleApprove(req.id)} className="px-3 py-1.5 bg-green-100 text-green-700 text-xs font-medium rounded-lg hover:bg-green-200 transition-colors">✓ Approve</button>
                  <button onClick={() => handleDeny(req.id)} className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-medium rounded-lg hover:bg-red-200 transition-colors">✗ Deny</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
