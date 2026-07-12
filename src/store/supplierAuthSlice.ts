/**
 * Supplier Auth Slice - Redux state management for supplier authentication
 * Handles supplier portal authentication and profile management
 */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

// Supplier types
export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  taxId?: string;
  businessId: string;
  hasPortalAccess: boolean;
  isActive: boolean;
}

export interface SupplierAuthState {
  isAuthenticated: boolean;
  supplier: Supplier | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: SupplierAuthState = {
  isAuthenticated: false,
  supplier: null,
  accessToken: localStorage.getItem('supplierAccessToken'),
  refreshToken: localStorage.getItem('supplierRefreshToken'),
  loading: false,
  error: null,
};

// Async thunk for supplier registration
export const supplierRegisterAsync = createAsyncThunk(
  'supplierAuth/register',
  async (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
    taxId?: string;
    companyName?: string;
  }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/supplier-auth/register`, data);
      
      if (response.data.success && response.data.data) {
        const { supplier, accessToken, refreshToken } = response.data.data;
        
        // Store tokens in localStorage
        localStorage.setItem('supplierAccessToken', accessToken);
        localStorage.setItem('supplierRefreshToken', refreshToken);
        
        return { supplier, accessToken, refreshToken };
      }
      return rejectWithValue(response.data.message || 'Registration failed');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Registration failed';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for supplier login
export const supplierLoginAsync = createAsyncThunk(
  'supplierAuth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/supplier-auth/login`, credentials);
      
      if (response.data.success && response.data.data) {
        const { supplier, accessToken, refreshToken } = response.data.data;
        
        // Store tokens in localStorage
        localStorage.setItem('supplierAccessToken', accessToken);
        localStorage.setItem('supplierRefreshToken', refreshToken);
        
        return { supplier, accessToken, refreshToken };
      }
      return rejectWithValue(response.data.message || 'Login failed');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Login failed';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for supplier logout
export const supplierLogoutAsync = createAsyncThunk(
  'supplierAuth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const token = localStorage.getItem('supplierAccessToken');
      
      await axios.post(
        `${API_BASE_URL}/supplier-auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      // Clear tokens
      localStorage.removeItem('supplierAccessToken');
      localStorage.removeItem('supplierRefreshToken');
      
      return true;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Logout failed';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for getting supplier profile
export const getSupplierProfileAsync = createAsyncThunk(
  'supplierAuth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('supplierAccessToken');
      
      const response = await axios.get(`${API_BASE_URL}/supplier-auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data.success && response.data.data) {
        return response.data.data.supplier;
      }
      return rejectWithValue(response.data.message || 'Failed to fetch profile');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Failed to fetch profile';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for changing password
export const changeSupplierPasswordAsync = createAsyncThunk(
  'supplierAuth/changePassword',
  async (data: { currentPassword: string; newPassword: string }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('supplierAccessToken');
      
      const response = await axios.post(
        `${API_BASE_URL}/supplier-auth/change-password`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (response.data.success) {
        return true;
      }
      return rejectWithValue(response.data.message || 'Failed to change password');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Failed to change password';
      return rejectWithValue(message);
    }
  }
);

// Create the slice
const supplierAuthSlice = createSlice({
  name: 'supplierAuth',
  initialState,
  reducers: {
    // Clear error
    clearSupplierError: (state) => {
      state.error = null;
    },
    // Set supplier from localStorage on app init
    initializeSupplierAuth: (state) => {
      const accessToken = localStorage.getItem('supplierAccessToken');
      const refreshToken = localStorage.getItem('supplierRefreshToken');
      
      if (accessToken && refreshToken) {
        state.accessToken = accessToken;
        state.refreshToken = refreshToken;
        state.isAuthenticated = true;
      }
    },
    // Manual logout (clear state)
    clearSupplierAuth: (state) => {
      state.isAuthenticated = false;
      state.supplier = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      localStorage.removeItem('supplierAccessToken');
      localStorage.removeItem('supplierRefreshToken');
    },
  },
  extraReducers: (builder) => {
    // Register
    builder
      .addCase(supplierRegisterAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(supplierRegisterAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.supplier = action.payload.supplier;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(supplierRegisterAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Login
      .addCase(supplierLoginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(supplierLoginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.supplier = action.payload.supplier;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
      })
      .addCase(supplierLoginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Logout
      .addCase(supplierLogoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(supplierLogoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.supplier = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(supplierLogoutAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Get Profile
      .addCase(getSupplierProfileAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(getSupplierProfileAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.supplier = action.payload;
      })
      .addCase(getSupplierProfileAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Change Password
      .addCase(changeSupplierPasswordAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changeSupplierPasswordAsync.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changeSupplierPasswordAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearSupplierError, initializeSupplierAuth, clearSupplierAuth } = supplierAuthSlice.actions;
export default supplierAuthSlice.reducer;
