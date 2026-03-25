'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { parentApi } from '@/lib/api';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';

interface Child {
  id: string;
  displayName: string;
  ageGroup: string;
  dateOfBirth: string;
  screenTimeDailyLimitMinutes: number;
  todayScreenTimeMinutes: number;
  isActive: boolean;
}

const createChildSchema = z.object({
  displayName: z.string().min(2, 'Name required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  pin: z.string().regex(/^\d{4,6}$/, '4-6 digit PIN'),
  confirmPin: z.string(),
  screenTimeLimitMinutes: z.coerce.number().min(30).max(480).default(120),
}).refine((d) => d.pin === d.confirmPin, { message: 'PINs do not match', path: ['confirmPin'] });

type CreateChildData = z.infer<typeof createChildSchema>;

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateChildData>({
    resolver: zodResolver(createChildSchema),
  });

  useEffect(() => {
    parentApi.getChildren().then((res) => setChildren(res.data.data ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const onCreateChild = async (data: CreateChildData) => {
    setCreating(true);
    try {
      await parentApi.createChild({
        displayName: data.displayName,
        dateOfBirth: data.dateOfBirth,
        pin: data.pin,
        screenTimeLimitMinutes: data.screenTimeLimitMinutes,
      });
      toast.success(`${data.displayName}'s account created!`);
      reset();
      setShowCreate(false);
      const res = await parentApi.getChildren();
      setChildren(res.data.data ?? []);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message ?? 'Failed to create child');
    } finally {
      setCreating(false);
    }
  };

  const getInitials = (name: string) => name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const COLORS = ['bg-primary', 'bg-secondary', 'bg-green-500', 'bg-amber-500', 'bg-pink-500'];

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Children</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-dark transition-colors">
          <Plus className="w-4 h-4" /> Add Child
        </button>
      </div>

      {children.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-300" />
          </div>
          <p className="font-medium">No children added yet</p>
          <p className="text-sm mt-1">Add your first child to start curating their content</p>
          <button onClick={() => setShowCreate(true)} className="mt-4 bg-primary text-white px-6 py-2 rounded-xl text-sm font-medium hover:bg-primary-dark">Add Child</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {children.map((child, idx) => {
            const pct = child.screenTimeDailyLimitMinutes > 0 ? Math.min((child.todayScreenTimeMinutes / child.screenTimeDailyLimitMinutes) * 100, 100) : 0;
            const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-green-500';
            return (
              <Link key={child.id} href={`/children/${child.id}`} className="card p-5 hover:shadow-md transition-shadow block">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 ${COLORS[idx % COLORS.length]} rounded-full flex items-center justify-center text-white font-bold`}>
                    {getInitials(child.displayName)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{child.displayName}</div>
                    <div className="text-xs text-gray-400 capitalize">{child.ageGroup?.replace('-', ' ')} {!child.isActive && '· Paused'}</div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Screen Time Today</span>
                    <span>{child.todayScreenTimeMinutes}m / {child.screenTimeDailyLimitMinutes}m</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create child modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Add Child Account</h2>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit(onCreateChild)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Name</label>
                <input {...register('displayName')} placeholder="Emma" className="input" />
                {errors.displayName && <p className="text-red-500 text-xs mt-1">{errors.displayName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input {...register('dateOfBirth')} type="date" className="input" />
                {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PIN (4-6 digits)</label>
                  <input {...register('pin')} type="password" inputMode="numeric" placeholder="••••" maxLength={6} className="input" />
                  {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                  <input {...register('confirmPin')} type="password" inputMode="numeric" placeholder="••••" maxLength={6} className="input" />
                  {errors.confirmPin && <p className="text-red-500 text-xs mt-1">{errors.confirmPin.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Daily Screen Time Limit</label>
                <select {...register('screenTimeLimitMinutes')} className="input">
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="180">3 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>
              <button type="submit" disabled={creating} className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark disabled:opacity-50 transition-colors">
                {creating ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
