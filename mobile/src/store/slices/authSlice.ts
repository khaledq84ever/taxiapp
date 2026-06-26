import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../../services/api';

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

export const sendOtp = createAsyncThunk('auth/sendOtp', async (phone: string) => {
  const res = await authApi.sendOtp(phone);
  return res.data;
});

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ phone, code, role }: { phone: string; code: string; role?: string }) => {
    const res = await authApi.verifyOtp(phone, code, role);
    await AsyncStorage.setItem('accessToken', res.data.accessToken);
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
      });
  },
});

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
