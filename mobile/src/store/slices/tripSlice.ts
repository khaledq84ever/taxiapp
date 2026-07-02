import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { tripsApi } from '../../services/api';

export const fetchActiveTrip = createAsyncThunk('trip/fetchActive', async () => {
  const res = await tripsApi.getActive();
  return res.data;
});

interface TripState {
  currentTrip: any | null;
  fareEstimate: any | null;
  nearbyDrivers: any[];
  loading: boolean;
  error: string | null;
}

const initialState: TripState = {
  currentTrip: null, fareEstimate: null, nearbyDrivers: [], loading: false, error: null,
};

export const estimateFare = createAsyncThunk('trip/estimate', async (data: any) => {
  const res = await tripsApi.estimate(data);
  return res.data;
});

export const requestTrip = createAsyncThunk('trip/request', async (data: any, { rejectWithValue }) => {
  try {
    const res = await tripsApi.request(data);
    return res.data;
  } catch (e: any) {
    // Surface the real server message (e.g. validation error) instead of a generic network error
    const serverMsg = e.response?.data?.message;
    return rejectWithValue(
      Array.isArray(serverMsg) ? serverMsg.join('\n') : serverMsg || 'No connection. Check your internet and try again.',
    );
  }
});

export const cancelTrip = createAsyncThunk('trip/cancel', async ({ id, reason }: { id: string; reason?: string }) => {
  await tripsApi.cancel(id, reason);
  return id;
});

const tripSlice = createSlice({
  name: 'trip',
  initialState,
  reducers: {
    setCurrentTrip: (state, action: PayloadAction<any>) => { state.currentTrip = action.payload; },
    setNearbyDrivers: (state, action: PayloadAction<any[]>) => { state.nearbyDrivers = action.payload; },
    clearTrip: (state) => { state.currentTrip = null; state.fareEstimate = null; },
    updateDriverLocation: (state, action: PayloadAction<{ lat: number; lng: number }>) => {
      if (state.currentTrip) {
        state.currentTrip.driverLat = action.payload.lat;
        state.currentTrip.driverLng = action.payload.lng;
      }
    },
    updateTripStatus: (state, action: PayloadAction<{ status: string; finalFare?: number }>) => {
      if (state.currentTrip) {
        state.currentTrip.status = action.payload.status;
        if (action.payload.finalFare !== undefined) {
          state.currentTrip.finalFare = action.payload.finalFare;
        }
      }
    },
    setDriverInfo: (state, action: PayloadAction<any>) => {
      if (state.currentTrip) {
        state.currentTrip.driver = action.payload;
        state.currentTrip.status = 'ACCEPTED';
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(estimateFare.fulfilled, (state, action) => { state.fareEstimate = action.payload; })
      .addCase(requestTrip.pending, (state) => { state.loading = true; })
      .addCase(requestTrip.fulfilled, (state, action) => { state.loading = false; state.currentTrip = action.payload; })
      .addCase(requestTrip.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? action.error.message ?? 'Failed to request trip';
      })
      .addCase(cancelTrip.fulfilled, (state) => { state.currentTrip = null; })
      .addCase(fetchActiveTrip.fulfilled, (state, action) => {
        if (action.payload) state.currentTrip = action.payload;
      });
  },
});

export const {
  setCurrentTrip,
  setNearbyDrivers,
  clearTrip,
  updateDriverLocation,
  updateTripStatus,
  setDriverInfo,
} = tripSlice.actions;
export default tripSlice.reducer;

// Re-export thunks from the same module for convenience
