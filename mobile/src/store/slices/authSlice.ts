import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, usersApi, tripsApi } from '../../services/api';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  otpSent: boolean;
}

const initialState: AuthState = {
  user: null, token: null, loading: false, error: null, otpSent: false,
};

// Restore session from saved token on app launch
export const initAuth = createAsyncThunk('auth/init', async () => {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) throw new Error('No saved session');
  const [profileRes, activeTrip] = await Promise.all([
    usersApi.getProfile(),
    tripsApi.getActive().catch(() => ({ data: null })),
  ]);
  return { user: profileRes.data, accessToken: token, activeTrip: activeTrip.data };
});

export const sendOtp = createAsyncThunk('auth/sendOtp', async (phone: string) => {
  const res = await authApi.sendOtp(phone);
  return res.data;
});

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, code, role }: { phone: string; code: string; role?: string }) => {
    const res = await authApi.verifyOtp(phone, code, role);
    await AsyncStorage.setItem('accessToken', res.data.accessToken);
    // Register push token after login (lazy import to avoid circular deps)
    import('../../services/notifications').then(({ registerForPushNotifications }) => {
      registerForPushNotifications();
    });
    return res.data;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<any>) => { state.user = action.payload; },
    logout: (state) => {
      state.user = null;
      state.token = null;
      AsyncStorage.removeItem('accessToken');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(sendOtp.fulfilled, (state) => { state.loading = false; state.otpSent = true; })
      .addCase(sendOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Failed to send OTP';
      })
      .addCase(verifyOtp.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Invalid OTP';
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      });
  },
});

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
