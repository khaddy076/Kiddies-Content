'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3002';

interface ChildProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  ageGroup: string;
}

const COLORS = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-pink-500'];

export default function ChildLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'select' | 'pin'>('email');
  const [parentEmail, setParentEmail] = useState('');
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.get(`${AUTH_URL}/api/v1/child/list`, { params: { parentEmail } });
      const list: ChildProfile[] = res.data.data ?? [];
      if (list.length === 0) {
        toast.error('No child accounts found for this email');
        return;
      }
      setChildren(list);
      setStep('select');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChild = (child: ChildProfile) => {
    setSelectedChild(child);
    setPin('');
    setStep('pin');
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 6) setPin((p) => p + digit);
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  const handlePinSubmit = async () => {
    if (!selectedChild || pin.length < 4) return;
    setLoading(true);
    try {
      const res = await axios.post(`${AUTH_URL}/api/v1/child/login`, {
        parentEmail,
        childId: selectedChild.id,
        pin,
      });
      const { tokens, user } = res.data.data;
      localStorage.setItem('child_access_token', tokens.accessToken);
      localStorage.setItem('child_user', JSON.stringify(user));
      toast.success(`Welcome, ${user.displayName}!`);
      router.push('/child');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast.error(error.response?.data?.error?.message ?? 'Incorrect PIN');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white text-2xl font-bold">K</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Kiddies Content</h1>
          <p className="text-gray-400 text-sm mt-1">Children&apos;s Login</p>
        </div>

        {/* Step 1 — Parent Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent&apos;s Email</label>
              <input
                type="email"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
                placeholder="parent@example.com"
                className="input w-full"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading || !parentEmail}
              className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Looking up...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2 — Select Child */}
        {step === 'select' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center mb-4">Who are you?</p>
            {children.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <div className={`w-12 h-12 ${COLORS[idx % COLORS.length]} rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {child.displayName[0]?.toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{child.displayName}</p>
                  <p className="text-xs text-gray-400 capitalize">{child.ageGroup?.replace('-', ' ')}</p>
                </div>
              </button>
            ))}
            <button onClick={() => setStep('email')} className="w-full text-sm text-gray-400 hover:text-gray-600 mt-2">
              ← Change email
            </button>
          </div>
        )}

        {/* Step 3 — PIN Entry */}
        {step === 'pin' && selectedChild && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-bold text-xl">
                {selectedChild.displayName[0]?.toUpperCase()}
              </div>
              <p className="font-semibold text-gray-900">{selectedChild.displayName}</p>
              <p className="text-sm text-gray-400 mt-1">Enter your PIN</p>
            </div>

            {/* PIN dots */}
            <div className="flex justify-center gap-3">
              {Array.from({ length: Math.max(pin.length + 1, 4) }, (_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length ? 'bg-purple-500 border-purple-500' : 'border-gray-300'}`}
                />
              ))}
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key, i) => (
                <button
                  key={i}
                  onClick={() => key === '⌫' ? handlePinDelete() : key ? handlePinInput(key) : null}
                  disabled={!key}
                  className={`h-14 rounded-2xl text-xl font-semibold transition-colors ${
                    key === '⌫' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' :
                    key ? 'bg-gray-50 text-gray-900 hover:bg-purple-100 active:bg-purple-200' :
                    'invisible'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>

            <button
              onClick={handlePinSubmit}
              disabled={pin.length < 4 || loading}
              className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold text-sm hover:bg-purple-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>

            <button onClick={() => { setStep('select'); setPin(''); }} className="w-full text-sm text-gray-400 hover:text-gray-600">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
