'use client';

import { useState, useEffect } from 'react';
import { parentApi } from '@/lib/api';
import { logout } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ParentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  religion?: string;
  incomeBracket?: string;
  region?: string;
  preferredLanguage?: string;
}

const RELIGIONS = ['christianity', 'islam', 'judaism', 'hinduism', 'buddhism', 'secular', 'other'];
const INCOME_BRACKETS = ['under_25k', '25k_50k', '50k_75k', '75k_100k', '100k_150k', 'over_150k'];

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    religion: '',
    incomeBracket: '',
    region: '',
    preferredLanguage: 'en',
  });

  useEffect(() => {
    parentApi.getProfile()
      .then((res) => {
        const p: ParentProfile = res.data.data;
        setProfile(p);
        setForm({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          religion: p.religion ?? '',
          incomeBracket: p.incomeBracket ?? '',
          region: p.region ?? '',
          preferredLanguage: p.preferredLanguage ?? 'en',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await parentApi.updateProfile(form);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your profile and preferences</p>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Profile Information</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
              <input
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
              <input
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={profile?.email ?? ''}
              disabled
              className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
              <select
                value={form.religion}
                onChange={(e) => setForm((p) => ({ ...p, religion: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Not specified</option>
                {RELIGIONS.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Income bracket</label>
              <select
                value={form.incomeBracket}
                onChange={(e) => setForm((p) => ({ ...p, incomeBracket: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Not specified</option>
                {INCOME_BRACKETS.map((b) => (
                  <option key={b} value={b}>{b.replace(/_/g, ' ').replace('k', 'K')}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Region / City</label>
              <input
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="e.g. New York, US"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
              <input
                value={form.preferredLanguage}
                onChange={(e) => setForm((p) => ({ ...p, preferredLanguage: e.target.value }))}
                placeholder="en"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Community note */}
      <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6">
        <h2 className="text-sm font-semibold text-indigo-900 mb-2">Why we ask for this information</h2>
        <p className="text-sm text-indigo-700">
          Your religion, income bracket, and region are used <strong>only</strong> to power the
          community recommendation engine — connecting you with parents who share similar values.
          This data is never sold or shared individually.
        </p>
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Account</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Log out</p>
            <p className="text-xs text-gray-500">Sign out on this device</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
