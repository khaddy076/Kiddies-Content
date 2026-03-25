import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  childId: string | null;
  parentId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: { childId: string; parentId: string; displayName: string; avatarUrl?: string; token: string }) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  childId: null,
  parentId: null,
  displayName: null,
  avatarUrl: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (credentials) => {
    await SecureStore.setItemAsync('child_token', credentials.token);
    await SecureStore.setItemAsync('child_data', JSON.stringify({
      childId: credentials.childId,
      parentId: credentials.parentId,
      displayName: credentials.displayName,
      avatarUrl: credentials.avatarUrl ?? null,
    }));
    set({ ...credentials, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('child_token');
    await SecureStore.deleteItemAsync('child_data');
    set({ childId: null, parentId: null, displayName: null, avatarUrl: null, token: null, isAuthenticated: false });
  },

  loadFromStorage: async () => {
    try {
      const token = await SecureStore.getItemAsync('child_token');
      const dataStr = await SecureStore.getItemAsync('child_data');
      if (token && dataStr) {
        const data = JSON.parse(dataStr) as { childId: string; parentId: string; displayName: string; avatarUrl: string | null };
        set({ ...data, token, isAuthenticated: true });
      }
    } catch {
      // ignore
    } finally {
      set({ isLoading: false });
    }
  },
}));
