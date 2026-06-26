import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://taxiapp-api-production.up.railway.app/api/v1';

const api = axios.create({ baseURL: API_URL, timeout: 10000 });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('accessToken');
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (phone: string, code: string, role?: string) =>
    api.post('/auth/verify-otp', { phone, code, role }),
};

export const usersApi = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
  getTripHistory: (page = 1) => api.get(`/users/trips/history?page=${page}`),
};

export const driversApi = {
  register: (data: any) => api.post('/drivers/register', data),
  getStatus: () => api.get('/drivers/status'),
  toggleOnline: (isOnline: boolean) => api.put('/drivers/toggle-online', { isOnline }),
  updateLocation: (lat: number, lng: number) => api.put('/drivers/location', { lat, lng }),
  getNearby: (lat: number, lng: number) => api.get(`/drivers/nearby?lat=${lat}&lng=${lng}`),
  getEarnings: (page = 1) => api.get(`/drivers/earnings?page=${page}`),
};

export const tripsApi = {
  estimate: (data: any) => api.post('/trips/estimate', data),
  request: (data: any) => api.post('/trips/request', data),
  getTrip: (id: string) => api.get(`/trips/${id}`),
  accept: (id: string) => api.put(`/trips/${id}/accept`),
  markArrived: (id: string) => api.put(`/trips/${id}/arrived`),
  start: (id: string) => api.put(`/trips/${id}/start`),
  complete: (id: string) => api.put(`/trips/${id}/complete`),
  cancel: (id: string, reason?: string) => api.put(`/trips/${id}/cancel`, { reason }),
};

export const ratingsApi = {
  create: (data: any) => api.post('/ratings', data),
};

export default api;
