import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3002';

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });
export const authApi = axios.create({ baseURL: `${AUTH_URL}/api/v1` });

// Attach JWT to every API request
api.interceptors.request.use(async (cfg) => {
  const token = await SecureStore.getItemAsync('parent_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('parent_refresh_token');
        const res = await authApi.post('/refresh', { refreshToken });
        const { accessToken } = res.data.data as { accessToken: string };
        await SecureStore.setItemAsync('parent_token', accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        await SecureStore.deleteItemAsync('parent_token');
        await SecureStore.deleteItemAsync('parent_refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export const parentApi = {
  // Auth
  login: (email: string, password: string) =>
    authApi.post('/login', { email, password }),
  register: (data: { email: string; password: string; firstName: string; lastName: string }) =>
    authApi.post('/register', data),
  getMe: () => authApi.get('/me'),

  // Profile
  getProfile: () => api.get('/parent/profile'),
  updateProfile: (data: object) => api.put('/parent/profile', data),

  // Children
  getChildren: () => api.get('/parent/children'),
  createChild: (data: object) => api.post('/parent/children', data),
  getChild: (childId: string) => api.get(`/parent/children/${childId}`),
  updateChild: (childId: string, data: object) => api.put(`/parent/children/${childId}`, data),

  // Requests
  getRequests: (params?: object) => api.get('/parent/requests', { params }),
  approveRequest: (requestId: string) => api.post(`/parent/requests/${requestId}/approve`),
  denyRequest: (requestId: string, note: string) =>
    api.post(`/parent/requests/${requestId}/deny`, { note }),

  // Library
  getChildLibrary: (childId: string, params?: object) =>
    api.get(`/parent/children/${childId}/library`, { params }),
  removeFromLibrary: (childId: string, contentId: string) =>
    api.delete(`/parent/children/${childId}/library/${contentId}`),

  // Recommendations
  getRecommendations: (childId: string) =>
    api.get(`/parent/recommendations/${childId}`),
  preApprove: (childId: string, videoId: string) =>
    api.post(`/parent/recommendations/${childId}/pre-approve`, { videoId }),

  // Content search
  searchContent: (query: string, params?: object) =>
    api.get('/content/search', { params: { q: query, ...params } }),

  // Screen time
  getChildScreenTime: (childId: string) =>
    api.get(`/parent/children/${childId}/screen-time`),
  updateScreenTimeSchedule: (childId: string, data: object) =>
    api.put(`/parent/children/${childId}/schedule`, data),

  // Notifications
  getNotifications: (params?: object) => api.get('/parent/notifications', { params }),
  markNotificationRead: (id: string) => api.put(`/parent/notifications/${id}/read`),

  // Push token
  registerPushToken: (token: string) =>
    api.post('/parent/device-token', { token, platform: 'mobile' }),
};
