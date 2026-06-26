import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getPendingDrivers: () => api.get('/admin/drivers/pending'),
  approveDriver: (id: string) => api.put(`/admin/drivers/${id}/approve`),
  rejectDriver: (id: string, reason?: string) => api.put(`/admin/drivers/${id}/reject`, { reason }),
  suspendDriver: (id: string) => api.put(`/admin/drivers/${id}/suspend`),
  getUsers: (page = 1, role?: string) => api.get(`/admin/users?page=${page}${role ? `&role=${role}` : ''}`),
  getTrips: (page = 1, status?: string) => api.get(`/admin/trips?page=${page}${status ? `&status=${status}` : ''}`),
};

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string) => api.post('/auth/verify-otp', { phone, code }),
};

export default api;
