import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, usersApi, tripsApi } from '../../services/api';

interface AuthState {
  user: any | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null, token: null, loading: false, error: null,
};

// Restore session or auto-create guest on first launch
export const initAuth = createAsyncThunk('auth/init', async () => {
  const token = await AsyncStorage.getItem('accessToken');

  if (token) {
    try {
      const [profileRes, activeTrip] = await Promise.all([
        usersApi.getProfile(),
        tripsApi.getActive().catch(() => ({ data: null })),
      ]);
      return { user: profileRes.data, accessToken: token, activeTrip: activeTrip.data };
    } catch {
      // Stored session is dead (expired/invalid token) — discard it and fall
      // through to a fresh guest, otherwise every API call 401s forever
      await AsyncStorage.removeItem('accessToken');
    }
  }

  const res = await authApi.guest();
  const newToken: string = res.data.accessToken;
  await AsyncStorage.setItem('accessToken', newToken);
  return { user: res.data.user, accessToken: newToken, activeTrip: null };
});

export const login = createAsyncThunk(
  'auth/login',
  async ({ phone, role }: { phone: string; role?: string }) => {
    const res = await authApi.login(phone, role);
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
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Login failed';
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.accessToken;
      });
  },
});

export const { setUser, logout, clearError } = authSlice.actions;
export default authSlice.reducer;
