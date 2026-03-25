import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
const AUTH_URL = process.env.EXPO_PUBLIC_AUTH_URL ?? 'http://localhost:3002';

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });
export const authHttp = axios.create({ baseURL: `${AUTH_URL}/api/v1` });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('child_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const childApi = {
  // Auth
  login: (parentEmail: string, childId: string, pin: string) =>
    authHttp.post('/child/login', { parentEmail, childId, pin }),

  // Browse
  browse: (page = 1, category?: string) =>
    api.get('/child/browse', { params: { page, limit: 20, category } }),
  search: (q: string) => api.get('/child/browse/search', { params: { q } }),
  getLibrary: () => api.get('/child/library'),
  getRecommendations: () => api.get('/child/recommendations'),

  // Requests
  requestContent: (youtubeVideoId: string, note?: string) =>
    api.post('/child/requests', { youtubeVideoId, note }),
  getRequests: () => api.get('/child/requests'),

  // Watch
  getWatchToken: (contentId: string) => api.get(`/child/watch/${contentId}`),
  startSession: (contentId: string, deviceType?: string) =>
    api.post('/child/watch/sessions', { contentId, deviceType: deviceType ?? 'mobile' }),
  heartbeat: (sessionId: string, watchSeconds: number) =>
    api.put(`/child/watch/sessions/${sessionId}/heartbeat`, { watchSeconds }),
  endSession: (sessionId: string, watchSeconds: number) =>
    api.post(`/child/watch/sessions/${sessionId}/end`, { watchSeconds }),

  // Screen time
  getScreenTime: () => api.get('/child/screen-time/today'),
  getProfile: () => api.get('/child/profile'),
};
