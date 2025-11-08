import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/v1';
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
  getAll: (params) => api.get('/posts', { params }),
  getBySlug: (slug) => api.get(`/posts/${slug}`),
  create: (data) => api.post('/posts/create', data),
  update: (id, data) => api.put(`/posts/update/${id}`, data),
  delete: (id) => api.delete(`/posts/delete/${id}`),
  like: (id) => api.post(`/interactions/${id}/like`),
  dislike: (id) => api.post(`/interactions/${id}/dislike`),
  share: (id) => api.post(`/interactions/${id}/share`),
  getRelated: (id) => api.get(`/posts/${id}/related`),
};

export const interactionsAPI = {
  like: (postId) => api.post(`/interactions/${postId}/like`),
  dislike: (postId) => api.post(`/interactions/${postId}/dislike`),
  share: (postId) => api.post(`/interactions/${postId}/share`),
  getPostInteractions: (postId) => api.get(`/interactions/${postId}/interactions`),
  getUserLikedPosts: (params) => api.get('/interactions/me/likes', { params }),
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
  create: (postId, data) => api.post(`/comments/create/${postId}`, data),
  update: (id, data) => api.put(`/comments/update/${id}`, data),
  delete: (id) => api.delete(`/comments/delete/${id}`),
  like: (id) => api.post(`/comments/like/${id}`),
};

export const newsletterAPI = {
  subscribe: (email) => api.post('/newsletters/subscribe', { email }),
  unsubscribe: (email) => api.post('/newsletters/unsubscribe', { email }),
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
};

export const adminAPI = {
  getUsers: (params) => api.get('/auth/allusers', { params }),
  getUserStats: () => api.get('/auth/stats'),
  promoteUser: (userId) => api.post(`/admin/promote/${userId}`),
  demoteUser: (userId) => api.post(`/admin/demote/${userId}`),
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
};

export default api;