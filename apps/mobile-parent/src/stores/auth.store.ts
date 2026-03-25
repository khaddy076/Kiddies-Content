import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface Parent {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthState {
  parent: Parent | null;
  isAuthenticated: boolean;
  hydrate: () => Promise<void>;
  setAuth: (parent: Parent, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  parent: null,
  isAuthenticated: false,

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync('parent_token');
      const parentJson = await SecureStore.getItemAsync('parent_data');
      if (token && parentJson) {
        const parent = JSON.parse(parentJson) as Parent;
        set({ parent, isAuthenticated: true });
      }
    } catch {
      set({ parent: null, isAuthenticated: false });
    }
  },

  setAuth: async (parent, token, refreshToken) => {
    await SecureStore.setItemAsync('parent_token', token);
    await SecureStore.setItemAsync('parent_refresh_token', refreshToken);
    await SecureStore.setItemAsync('parent_data', JSON.stringify(parent));
    set({ parent, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('parent_token');
    await SecureStore.deleteItemAsync('parent_refresh_token');
    await SecureStore.deleteItemAsync('parent_data');
    set({ parent: null, isAuthenticated: false });
  },
}));
