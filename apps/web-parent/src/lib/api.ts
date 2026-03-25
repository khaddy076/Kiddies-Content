import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:3002';

export const api = axios.create({ baseURL: `${API_URL}/api/v1` });
export const authApi = axios.create({ baseURL: `${AUTH_URL}/api/v1/auth` });
export const authServiceApi = axios.create({ baseURL: `${AUTH_URL}/api/v1` });

const attachToken = (config: Parameters<Parameters<typeof api.interceptors.request.use>[0]>[0]) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

// Attach JWT to every request
api.interceptors.request.use(attachToken);
authServiceApi.interceptors.request.use(attachToken);

// Handle 401 → redirect to login
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Parent API calls ─────────────────────────────────────────────────────

export const parentApi = {
  // Auth
  login: (email: string, password: string) =>
    authApi.post('/login', { email, password }),
  register: (data: { email: string; password: string; displayName: string; phone?: string }) =>
    authApi.post('/register', data),
  getMe: () => authApi.get('/me'),

  // Profile
  getProfile: () => api.get('/parent/profile'),
  updateProfile: (data: Record<string, unknown>) => api.put('/parent/profile', data),

  // Children
  getChildren: () => api.get('/parent/children'),
  getChild: (childId: string) => api.get(`/parent/children/${childId}`),
  updateChild: (childId: string, data: { isPaused?: boolean; screenTimeLimitMinutes?: number }) =>
    api.put(`/parent/children/${childId}`, data),
  getChildScreenTime: (childId: string) => api.get(`/parent/children/${childId}/screen-time`),
  getChildLibrary: (childId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/parent/library/${childId}`, { params }),
  createChild: (data: { displayName: string; dateOfBirth: string; pin: string; screenTimeLimitMinutes?: number }) =>
    authServiceApi.post('/child/create', data),

  // Requests
  getRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/parent/requests', { params }),
  getRequest: (id: string) => api.get(`/parent/requests/${id}`),
  approveRequest: (id: string, note?: string) => api.post(`/parent/requests/${id}/approve`, { note }),
  denyRequest: (id: string, note: string) => api.post(`/parent/requests/${id}/deny`, { note }),
  preApproveContent: (youtubeVideoId: string, childId: string) =>
    api.post('/parent/content/pre-approve', { youtubeVideoId, childId }),

  // Library
  getLibrary: (childId: string, params?: { page?: number; limit?: number }) =>
    api.get(`/parent/library/${childId}`, { params }),
  removeFromLibrary: (childId: string, contentId: string) =>
    api.delete(`/parent/library/${childId}/${contentId}`),

  // Filters
  getFilters: (childId: string) => api.get(`/parent/children/${childId}/filters`),
  addFilter: (childId: string, data: { filterType: string; filterValue: string }) =>
    api.post(`/parent/children/${childId}/filters`, data),
  removeFilter: (childId: string, filterId: string) =>
    api.delete(`/parent/children/${childId}/filters/${filterId}`),

  // Schedule
  getSchedule: (childId: string) => api.get(`/parent/children/${childId}/schedule`),
  updateSchedule: (childId: string, schedule: Array<{ dayOfWeek: number; allowedStart: string; allowedEnd: string }>) =>
    api.put(`/parent/children/${childId}/schedule`, schedule),

  // Analytics
  getWatchTimeAnalytics: (childId: string) => api.get(`/parent/analytics/${childId}/watch-time`),
  getContentAnalytics: (childId: string) => api.get(`/parent/analytics/${childId}/content`),
  getCategoryAnalytics: (childId: string) => api.get(`/parent/analytics/${childId}/categories`),

  // Notifications
  getNotifications: () => api.get('/parent/notifications'),
  markRead: (id: string) => api.put(`/parent/notifications/${id}/read`),
  markAllRead: () => api.put('/parent/notifications/read-all'),

  // Platforms
  getPlatforms: () => api.get('/parent/platforms'),
  getYouTubeConnectUrl: () => api.get('/parent/platforms/youtube/connect'),
  disconnectPlatform: (platform: string) => api.delete(`/parent/platforms/${platform}`),

  // Content search
  searchContent: (q: string, maxResults?: number) => api.get('/content/search', { params: { q, maxResults } }),
  getYouTubeVideo: (videoId: string) => api.get(`/content/youtube/${videoId}`),

  // Recommendations
  getRecommendations: (childId: string) => api.get(`/recommendations/child/${childId}`),

  // Emergency
  pauseAll: () => api.post('/parent/children/pause-all'),
  resumeAll: () => api.post('/parent/children/resume-all'),
};
