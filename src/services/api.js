import axios from 'axios';
import { getAuthToken, clearAuthToken } from '../utils/tokenStorage.js';
import { getCachedResponse, setCachedResponse, shouldCache, CACHE_CONFIG, clearCache } from '../utils/apiCache.js';
import { deduplicateRequest } from '../utils/requestDeduplication.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/v1';

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  console.error(
    '⚠️ VITE_API_BASE_URL is not set in production! ' +
    'Please set it in your hosting platform environment variables.'
  );
}

// Log API configuration in development (only in verbose mode)
if (import.meta.env.DEV && import.meta.env.VITE_VERBOSE_LOGGING === 'true') {
  console.log('[API] Base URL:', BASE_URL);
  console.log('[API] Environment:', import.meta.env.MODE);
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (typeof window !== 'undefined') {
      config._startTime = Date.now();
    }
    
    if (shouldCache(config.method, config.url)) {
      const cached = getCachedResponse(config.url, config.params);
      if (cached) {
        return Promise.reject({
          __cached: true,
          data: cached,
          config,
        });
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (typeof window !== 'undefined' && response.config._startTime) {
      const duration = Date.now() - response.config._startTime;
      import('../utils/performanceMonitor.js').then(({ default: perfMonitor }) => {
        perfMonitor.trackAPICall(
          response.config.url,
          response.config.method,
          duration,
          response.status
        );
      });
    }

    const config = response.config;
    if (shouldCache(config.method, config.url)) {
      let ttl = CACHE_CONFIG.posts.ttl;
      
      if (config.url.includes('/categories') || config.url.includes('/tags')) {
        ttl = CACHE_CONFIG.categories.ttl;
      } else if (config.url.includes('/notifications')) {
        ttl = CACHE_CONFIG.notifications.ttl;
      } else if (config.url.includes('/auth/profile') || config.url.includes('/authors/')) {
        ttl = CACHE_CONFIG.authorProfile.ttl;
      }
      
      setCachedResponse(config.url, config.params, response.data, ttl);
    }
    
    return response;
  },
  (error) => {
    if (error.__cached) {
      return Promise.resolve({
        data: error.data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config,
        __fromCache: true,
      });
    }
    
    // Log errors (but not sensitive data) - only in development
    if (!error.silent && import.meta.env.DEV) {
      console.error('API request failed:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
      });
    }
    
    // Network errors (no response from server)
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    
    
    if (error.response?.status === 401) {
      // Only redirect to login for protected endpoints, not public content
      // Axios provides the URL in error.config.url (relative to baseURL)
      const url = error.config?.url || '';
      const baseURL = error.config?.baseURL || '';
      
      // Normalize URL - remove base path to check endpoint pattern
      // Handle both /v1/posts/slug and /posts/slug formats, and full URLs
      let normalizedUrl = url.replace(/^\/v1\//, '').replace(/^\//, '');
      // Also handle full URLs if baseURL is included in url
      if (normalizedUrl.includes('://')) {
        normalizedUrl = normalizedUrl.replace(/^https?:\/\/[^/]+/, '').replace(/^\/v1\//, '').replace(/^\//, '');
      }
      // Remove baseURL from normalizedUrl if it's there
      if (baseURL && normalizedUrl.startsWith(baseURL.replace(/^https?:\/\/[^/]+/, ''))) {
        normalizedUrl = normalizedUrl.replace(baseURL.replace(/^https?:\/\/[^/]+/, ''), '').replace(/^\/v1\//, '').replace(/^\//, '');
      }
      
      
      // Check if this is a public endpoint that shouldn't require authentication
      // Match patterns like: posts/slug, categories/slug, authors/username, tags/tag, search
      const isPublicEndpoint = 
        // Public post endpoints (GET /posts/:slug, but not create/update/delete/bulk)
        (normalizedUrl.match(/^posts\/[^/]+$/) && !normalizedUrl.includes('/create') && !normalizedUrl.includes('/update') && !normalizedUrl.includes('/delete') && !normalizedUrl.includes('/bulk')) ||
        // Public post-related endpoints (related posts)
        normalizedUrl.match(/^posts\/[^/]+\/related$/) ||
        // Public comments endpoints (GET comments for a post)
        normalizedUrl.match(/^comments\/[^/]+\/comments$/) ||
        // Public category endpoints
        (normalizedUrl.startsWith('categories') && !normalizedUrl.includes('/create') && !normalizedUrl.includes('/update') && !normalizedUrl.includes('/delete')) ||
        // Public author profile endpoints
        normalizedUrl.match(/^authors\/[^/]+$/) ||
        // Public tag endpoints
        normalizedUrl.match(/^tags\/[^/]+$/) ||
        // Search endpoint
        normalizedUrl.startsWith('search') ||
        // Public polls endpoint (GET poll by post)
        normalizedUrl.match(/^polls\/post\/[^/]+$/);
      
      // Special case: /auth/me endpoint - NEVER redirect for this endpoint
      // It's just a verification call, and failing it shouldn't force login
      // This allows users to browse public content even with invalid/expired token
      const isAuthMe = normalizedUrl === 'auth/me';
      
      // Special case: /collaborations endpoints - these are optional and should fail silently
      // They're already handled with try-catch in components, so don't redirect
      const isCollaborationsEndpoint = normalizedUrl.startsWith('collaborations/');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isOnPublicPage = currentPath && (
        currentPath.startsWith('/posts/') ||
        currentPath.startsWith('/categories/') ||
        currentPath.startsWith('/authors/') ||
        currentPath.startsWith('/tags/') ||
        currentPath.startsWith('/search') ||
        currentPath === '/' ||
        currentPath.startsWith('/preview/')
      );
      
      // For protected endpoints, redirect to login (unless it's /auth/me, collaborations, or a public endpoint)
      // IMPORTANT: /auth/me and /collaborations should NEVER cause a redirect
      if (!isPublicEndpoint && !isAuthMe && !isCollaborationsEndpoint) {
          clearAuthToken();
          localStorage.removeItem('user');
          window.location.href = '/login';
      } else {
        // For public endpoints with 401, just clear invalid token but don't redirect
        // This allows users to view public content even if their token is invalid
        if (import.meta.env.DEV) {
          console.warn('[API] 401 on public endpoint or auth/me on public page, clearing token but not redirecting:', {
            normalizedUrl,
            fullUrl: url,
            currentPage: currentPath,
            isPublicEndpoint,
            isAuthMe,
            isOnPublicPage
          });
        }
        clearAuthToken();
        // Don't remove user from localStorage as they might still be viewing public content
      }
    }
    
    if (error.response?.status === 404) {
      const url = error.config?.url || '';
      const normalizedUrl = url.replace(/^\/v1\//, '').replace(/^\//, '');
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      
      // Silent 404s for optional resources
      if (url.includes('/polls/post/')) {
        error.silent = true;
        return Promise.reject(error);
      }
      
      // Posts endpoints are public - 404s are legitimate (post doesn't exist, etc.)
      // Don't treat them as auth issues
      const isPostsEndpoint = 
        normalizedUrl === 'posts' ||
        normalizedUrl.startsWith('posts/') ||
        normalizedUrl.startsWith('categories/') ||
        normalizedUrl.startsWith('tags/') ||
        normalizedUrl.startsWith('authors/') ||
        normalizedUrl.startsWith('search');
      
      if (isPostsEndpoint) {
        // Legitimate 404 for public content - don't clear token or redirect
        // Just let the error propagate normally so components can handle it
        return Promise.reject(error);
      }
      
      // Check if this is a protected endpoint (admin, auth, dashboard related)
      // Exclude /auth/me and /auth/login/register as they're handled separately
      const isProtectedEndpoint = 
        (normalizedUrl.startsWith('admin/') ||
        normalizedUrl.startsWith('auth/allusers') ||
        normalizedUrl.startsWith('auth/stats') ||
        normalizedUrl.includes('/dashboard') ||
        normalizedUrl.includes('/settings') ||
        normalizedUrl.includes('/collaborations') ||
        normalizedUrl.includes('/authors/apply') ||
        normalizedUrl.includes('/authors/applications')) &&
        !normalizedUrl.includes('/polls/post/') &&
        normalizedUrl !== 'auth/me';
      
      // Check if user is on a protected page
      const isProtectedPage = currentPath && (
        currentPath.startsWith('/admin/') ||
        currentPath.startsWith('/dashboard') ||
        currentPath.startsWith('/settings')
      );
      
      // If 404 on a protected endpoint or protected page, might be expired token or server issue
      // Be more conservative - only clear token if we're sure it's an auth issue
      if (isProtectedEndpoint || isProtectedPage) {
        // Don't show 404 error toast - it might be an auth issue
        error.silent = true;
        
        // Only clear token and redirect if:
        // 1. We're on a protected page AND
        // 2. The endpoint is definitely an auth endpoint (not just any protected endpoint)
        // This prevents clearing valid tokens due to server issues or missing endpoints
        const isAuthEndpoint = normalizedUrl.startsWith('auth/') && 
          (normalizedUrl === 'auth/me' || normalizedUrl.startsWith('auth/allusers') || normalizedUrl.startsWith('auth/stats'));
        
        // Only clear token for auth endpoints, not for all protected endpoints
        // Other 404s might be legitimate (missing resources, etc.)
        if (isProtectedPage && isAuthEndpoint && typeof window !== 'undefined') {
          // This is likely an auth issue - clear token and redirect
          clearAuthToken();
          localStorage.removeItem('user');
          localStorage.removeItem('lastAuthCheck');
          const redirectPath = `/login?redirect=${encodeURIComponent(currentPath)}`;
          window.location.href = redirectPath;
        }
        // For other protected endpoints with 404, don't clear token
        // It might be a server issue or missing resource, not an auth problem
      }
    }
    
    // Mark collaborations 401 errors as silent (expected for public posts)
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/collaborations/') && url.includes('/collaborators')) {
        error.silent = true;
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
  getUserProfile: (userId) => api.get(`/auth/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/auth/update/${userId}`, data),
  deleteUser: (userId) => api.delete(`/auth/delete/${userId}`),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  validateResetToken: (token) => api.get('/auth/validate-reset-token', { params: { token } }),
};

export const postsAPI = {
  getAll: (params) => {
    const requestKey = `get:/posts:${JSON.stringify(params || {})}`;
    return deduplicateRequest(requestKey, () => api.get('/posts', { params }));
  },
  getBySlug: (slug) => {
    const requestKey = `get:/posts/${slug}:`;
    return deduplicateRequest(requestKey, () => api.get(`/posts/${slug}`));
  },
  create: async (data) => {
    const response = await api.post('/posts/create', data);
    clearCache('/posts');
    clearCache('/categories');
    return response;
  },
  update: async (id, data) => {
    const response = await api.put(`/posts/update/${id}`, data);
    clearCache('/posts');
    clearCache(`/posts/${id}`);
    return response;
  },
  delete: async (id) => {
    const response = await api.delete(`/posts/delete/${id}`);
    clearCache('/posts');
    clearCache(`/posts/${id}`);
    return response;
  },
  like: (id) => api.post(`/interactions/${id}/like`),
  dislike: (id) => api.post(`/interactions/${id}/dislike`),
  share: (id) => api.post(`/interactions/${id}/share`),
  bookmark: (id) => api.post(`/interactions/${id}/bookmark`),
  getRelated: (id) => api.get(`/posts/${id}/related`),
  bulkDelete: async (postIds) => {
    const response = await api.post('/posts/bulk-delete', { postIds });
    clearCache('/posts');
    return response;
  },
  bulkUpdate: async (postIds, updates) => {
    const response = await api.put('/posts/bulk-update', { postIds, updates });
    clearCache('/posts');
    return response;
  },
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAsViewed: (notificationId) => api.patch(`/notifications/${notificationId}/viewed`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (settings) => api.put('/notifications/settings', settings),
  delete: (notificationId) => api.delete(`/notifications/${notificationId}`),
  deleteAll: () => api.delete('/notifications/clear-all'),
};

export const interactionsAPI = {
  like: (postId) => api.post(`/interactions/${postId}/like`),
  dislike: (postId) => api.post(`/interactions/${postId}/dislike`),
  share: (postId) => api.post(`/interactions/${postId}/share`),
  bookmark: (postId) => api.post(`/interactions/${postId}/bookmark`),
  getPostInteractions: (postId) => api.get(`/interactions/${postId}/interactions`),
  getUserLikedPosts: (params) => api.get('/interactions/me/likes', { params }),
  getUserBookmarkedPosts: (params) => api.get('/interactions/me/bookmarks', { params }),
  react: (postId, reactionType) => api.post(`/interactions/${postId}/react`, { reactionType }),
  getReactions: (postId) => api.get(`/interactions/${postId}/reactions`),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  getPosts: (slug, params) => api.get(`/categories/${slug}/posts`, { params }),
  getStats: () => api.get('/categories/stats'),
  create: (data) => api.post('/categories/create', data),
  update: (id, data) => api.put(`/categories/update/${id}`, data),
  delete: (id) => api.delete(`/categories/delete/${id}`),
};

export const commentsAPI = {
  getByPost: (postId, params) => api.get(`/comments/${postId}/comments`, { params }),
  create: async (postId, data) => {
    const response = await api.post(`/comments/create/${postId}`, data);
    clearCache(`/comments/${postId}`);
    clearCache(`/posts/${postId}`);
    return response;
  },
  update: async (id, data) => {
    const response = await api.put(`/comments/update/${id}`, data);
    clearCache('/comments');
    return response;
  },
  delete: async (id) => {
    const response = await api.delete(`/comments/delete/${id}`);
    clearCache('/comments');
    return response;
  },
  like: async (id) => {
    const response = await api.post(`/comments/like/${id}`);
    // Clear cache to ensure fresh data on next fetch
    clearCache('/comments');
    return response;
  },
};

export const newsletterAPI = {
  subscribe: (payload) => {
    const body = typeof payload === 'string' ? { email: payload } : payload;
    return api.post('/newsletters/subscribe', body);
  },
  unsubscribe: (email) => api.get('/newsletters/unsubscribe', { params: { email } }),
  getAll: (params) => api.get('/newsletters', { params }),
  getArchive: (params) => api.get('/newsletters/archive', { params }),
};

export const searchAPI = {
  search: (params) => api.get('/search', { params }),
  getPopularTags: () => api.get('/search/tags/popular'),
  getSuggestions: (q) => api.get('/search/suggestions', { params: { q } }),
};

export const dashboardAPI = {
  getOverview: () => api.get('/dashboard'),
  getPosts: (params) => api.get('/dashboard/posts', { params }),
  getComments: (params) => api.get('/dashboard/comments', { params }),
  getLikes: (params) => api.get('/dashboard/likes', { params }),
  getHistory: (params) => api.get('/dashboard/history', { params }),
  getBookmarks: (params) => api.get('/interactions/me/bookmarks', { params }),
};

export const adminAPI = {
  getUsers: (params) => api.get('/auth/allusers', { params }),
  getUserStats: () => api.get('/auth/stats'),
  promoteUser: (userId) => api.post(`/admin/promote/${userId}`),
  demoteUser: (userId) => api.post(`/admin/demote/${userId}`),
  demoteToAuthor: (userId) => api.post(`/admin/demote-to-author/${userId}`),
  getNewsletterStats: () => api.get('/newsletters/stats'),
  getNewsletterSubscribers: () => api.get('/newsletters/subscribers'),
  sendNewsletter: (data) => api.post('/newsletters/send', data),
  notifyNewPost: (postId) => api.post(`/newsletters/notify-new-post/${postId}`),
};

export const imagesAPI = {
  upload: (formData) => api.post('/images/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getInfo: () => api.get('/images'),
  delete: (imageUrl) => api.delete('/images/delete', { data: { imageUrl } }),
};

export const authorsAPI = {
  apply: (data) => api.post('/authors/apply', data),
  getApplications: (params) => api.get('/authors/applications', { params }),
  reviewApplication: (applicationId, data) => api.post(`/authors/applications/${applicationId}/review`, data),
  promoteToAuthor: (userId) => api.post(`/authors/users/${userId}/promote`),
  demoteFromAuthor: (userId) => api.post(`/authors/users/${userId}/demote`),
};

export const pollsAPI = {
  getAll: (params) => api.get('/polls', { params }),
  getById: (pollId) => api.get(`/polls/${pollId}`),
  create: (data) => api.post('/polls', data),
  update: (pollId, data) => api.put(`/polls/${pollId}`, data),
  delete: (pollId) => api.delete(`/polls/${pollId}`),
  vote: (pollId, optionId) => api.post(`/polls/${pollId}/vote`, { optionId }),
  getResults: (pollId) => api.get(`/polls/${pollId}/results`),
  getByPost: (postId) => {
    return api.get(`/polls/post/${postId}`, {
      validateStatus: function (status) {
        return status === 200 || status === 404;
      }
    });
  },
  getAnalytics: (pollId) => api.get(`/polls/${pollId}/analytics`),
  exportResults: (pollId, format = 'json') => api.get(`/polls/${pollId}/export`, { 
    params: { format },
    responseType: format === 'csv' ? 'blob' : 'json'
  }),
};

export const collaborationsAPI = {
  invite: (postId, email, role) => api.post(`/collaborations/${postId}/invite`, { email, role }),
  acceptInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/accept`),
  rejectInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/reject`),
  revokeInvitation: (invitationId) => api.post(`/collaborations/invitations/${invitationId}/revoke`),
  getCollaborators: (postId) => api.get(`/collaborations/${postId}/collaborators`),
  removeCollaborator: (postId, userId) => api.delete(`/collaborations/${postId}/collaborators/${userId}`),
  getMyInvitations: (includeSent = false) => {
    const params = includeSent ? { include: 'sent' } : {};
    return api.get('/collaborations/me/invitations', { params });
  },
  getSentInvitations: (postId) => api.get(`/collaborations/${postId}/invitations/sent`),
  getPostInvitations: (postId) => api.get(`/collaborations/${postId}/invitations`),
  getMySentInvitations: () => api.get('/collaborations/me/invitations/sent'),
};

export const followsAPI = {
  follow: (userId) => api.post(`/follows/${userId}/follow`),
  unfollow: (userId) => api.delete(`/follows/${userId}/follow`),
  getStatus: (userId) => api.get(`/follows/${userId}/status`),
  getFollowers: (userId, params) => api.get(`/follows/${userId}/followers`, { params }),
  getFollowing: (userId, params) => api.get(`/follows/${userId}/following`, { params }),
  getStats: (userId) => api.get(`/follows/${userId}/stats`),
};

export const templatesAPI = {
  getAll: () => api.get('/templates'),
  getById: (templateId) => api.get(`/templates/${templateId}`),
  create: (data) => api.post('/templates', data),
  update: (templateId, data) => api.put(`/templates/${templateId}`, data),
  delete: (templateId) => api.delete(`/templates/${templateId}`),
  use: (templateId) => api.post(`/templates/${templateId}/use`),
  initializeDefaults: () => api.post('/templates/initialize-defaults'),
};

export default api;