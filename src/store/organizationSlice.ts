/**
 * Organization Slice - Redux state management for organizations
 * Handles organization listing and management for super admin
 */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import type { Organization } from '../types/organization.types';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Organization state interface
export interface OrganizationState {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// Initial state
const initialState: OrganizationState = {
  organizations: [],
  loading: false,
  error: null,
  initialized: false,
};

// Async thunk for fetching organizations
export const fetchOrganizationsAsync = createAsyncThunk(
  'organization/fetchOrganizations',
  async (filters?: { search?: string; isActive?: boolean; limit?: number }, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.search) queryParams.append('search', filters.search);
      if (filters?.isActive !== undefined) queryParams.append('isActive', filters.isActive.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const endpoint = `/organizations${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await api.get(endpoint);

      if (response.data.success && response.data.data) {
        // Handle both possible response structures
        const orgList = response.data.data.organizations || response.data.data.businesses || response.data.data || [];
        return orgList;
      }
      return rejectWithValue(response.data.message || 'Failed to fetch organizations');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Failed to fetch organizations';
      return rejectWithValue(message);
    }
  }
);

// Organization slice
const organizationSlice = createSlice({
  name: 'organization',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    resetOrganizations: (state) => {
      state.organizations = [];
      state.error = null;
      state.initialized = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch organizations
      .addCase(fetchOrganizationsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrganizationsAsync.fulfilled, (state, action: PayloadAction<Organization[]>) => {
        state.loading = false;
        state.organizations = action.payload;
        state.initialized = true;
        state.error = null;
      })
      .addCase(fetchOrganizationsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = true;
      });
  },
});

// Export actions
export const { clearError, setLoading, resetOrganizations } = organizationSlice.actions;

// Export reducer
export default organizationSlice.reducer;