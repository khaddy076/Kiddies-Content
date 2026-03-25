'use client';

import { parentApi } from './api';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function isAuthenticated(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]!));
    return (payload.exp as number) * 1000 > Date.now();
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<{
  user: { id: string; email: string; displayName: string; role: string };
}> {
  const res = await parentApi.login(email, password);
  const { user, tokens } = res.data.data;
  localStorage.setItem('access_token', tokens.accessToken);
  localStorage.setItem('refresh_token', tokens.refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
  return { user };
}

export function logout(): void {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getCurrentUser(): { id: string; email: string; displayName: string; role: string } | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}
