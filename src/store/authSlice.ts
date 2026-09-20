/**
 * Auth Slice - Redux state management for authentication
 * Handles user authentication, permissions, and role-based access control
 */
import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import axios, { AxiosError } from 'axios';
import type { AuthState, BillingBlock, User } from './types';
import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
} from '../utils/tokenStorage';

const API_BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

// Create axios instance with interceptors
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Required for sending/receiving cookies in cross-origin requests
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  initialized: false,
  requiresBranchSelection: false,
  assignedBranches: [],
  billingBlock: null,
};

/**
 * Pull the message   and, when the refusal is a subscription block, the detail
 * the customer needs to fix it   out of a failed request.
 *
 * The rejected payload stays readable as a plain string by every existing
 * caller (`String(payload)` and `payload?.message` both give the message), so
 * adding the billing detail changes nothing for any other error.
 */
const describeAuthFailure = (
  error: unknown,
  fallback: string,
): { message: string; billing: BillingBlock | null } => {
  const axiosError = error as AxiosError<{ message?: string; details?: BillingBlock }>;
  const details = axiosError?.response?.data?.details;
  return {
    message: axiosError?.response?.data?.message || axiosError?.message || fallback,
    billing: details?.code === 'BILLING_BLOCKED' ? details : null,
  };
};

/** The message out of whatever a rejected thunk carried. */
const failureMessage = (payload: unknown, fallback: string): string =>
  typeof payload === 'string'
    ? payload
    : (payload as { message?: string } | null)?.message || fallback;

/** The billing block out of whatever a rejected thunk carried, if any. */
const failureBilling = (payload: unknown): BillingBlock | null =>
  typeof payload === 'string'
    ? null
    : (payload as { billing?: BillingBlock } | null)?.billing || null;

// Async thunk for login
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/login', { ...credentials, clientApp: 'sellmate' });
      
      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        const accessToken = response.data.data.accessToken;
        const refreshToken = response.data.data.refreshToken;
        const requiresBranchSelection = !!response.data.data.requiresBranchSelection;
        const assignedBranches = response.data.data.assignedBranches || user?.assignedBranches || [];

        // Store tokens in sessionStorage
        try {
          setAccessToken(response.data.data.accessToken);
          setRefreshToken(response.data.data.refreshToken);
          console.log('[authSlice] Tokens stored in sessionStorage');
        } catch (error) {
          console.error('[authSlice] Error setting tokens:', error);
        }

        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken, requiresBranchSelection, assignedBranches };
      }
      return rejectWithValue(response.data.message || 'Login failed');
    } catch (error) {
      return rejectWithValue(describeAuthFailure(error, 'Login failed'));
    }
  }
);

// Async thunk for selecting the active branch after login (re-issues a scoped token)
export const selectBranchAsync = createAsyncThunk(
  'auth/selectBranch',
  async (
    payload: { branchId: string | null; mode?: 'admin' | 'branch' },
    { rejectWithValue }
  ) => {
    try {
      const response = await api.post('/auth/select-branch', payload);

      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        const accessToken = response.data.data.accessToken;
        const refreshToken = response.data.data.refreshToken;

        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken };
      }

      return rejectWithValue(response.data.message || 'Failed to select branch');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Failed to select branch';
      return rejectWithValue(message);
    }
  }
);

export const qrLoginAsync = createAsyncThunk(
  'auth/qrLogin',
  async (payload: { qrToken: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/qr-login', { ...payload, clientApp: 'sellmate' });

      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        const accessToken = response.data.data.accessToken;
        const refreshToken = response.data.data.refreshToken;
        const requiresBranchSelection = !!response.data.data.requiresBranchSelection;
        const assignedBranches = response.data.data.assignedBranches || user?.assignedBranches || [];

        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, accessToken, refreshToken, requiresBranchSelection, assignedBranches };
      }

      return rejectWithValue(response.data.message || 'QR login failed');
    } catch (error) {
      return rejectWithValue(describeAuthFailure(error, 'QR login failed'));
    }
  }
);

// Async thunk for super admin login
export const superAdminLoginAsync = createAsyncThunk(
  'auth/superAdminLogin',
  async (credentials: { email: string; password: string; secretKey: string }, { rejectWithValue }) => {
    try {
      const response = await api.post('/auth/admin/login', credentials);
      
      if (response.data.success && response.data.data) {
        const { user } = response.data.data;
        const accessToken = response.data.data.accessToken;
        const refreshToken = response.data.data.refreshToken;
        
        console.log('[authSlice] Super admin login successful, setting tokens');
        
        // Store tokens in sessionStorage
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        

        
        // Store user in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(user));
        
        return { user, accessToken, refreshToken };
      }
      
      return rejectWithValue(response.data.message || 'Super admin login failed');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      const message = axiosError.response?.data?.message || axiosError.message || 'Super admin login failed';
      return rejectWithValue(message);
    }
  }
);

// Async thunk for logout
export const logoutAsync = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Continue with local logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      // Clear tokens and user data
      clearAllTokens();
      localStorage.removeItem('user');
    }
    return null;
  }
);

// Async thunk for refreshing token
export const refreshTokenAsync = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const refreshTokenValue = getRefreshToken();
      
      if (!refreshTokenValue) {
        return rejectWithValue('No refresh token available');
      }
      
      const response = await api.post('/auth/refresh-token', {
        refreshToken: refreshTokenValue,
      });
      
      if (response.data.success && response.data.data) {
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        
        // Update tokens in sessionStorage
        setAccessToken(accessToken);
        setRefreshToken(newRefreshToken);
        
        return { accessToken, refreshToken: newRefreshToken };
      }
      
      return rejectWithValue('Token refresh failed');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return rejectWithValue(axiosError.response?.data?.message || 'Token refresh failed');
    }
  }
);

// Async thunk for fetching user profile
export const fetchProfileAsync = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/auth/profile');
      
      if (response.data.success && response.data.data) {
        const userData = response.data.data;
        
        // Ensure locationCode is set from location.locationCode if not directly available
        if (!userData.locationCode && userData.location?.locationCode) {
          userData.locationCode = userData.location.locationCode;
        }
        
        // Store updated user in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        
        return userData;
      }
      
      return rejectWithValue('Failed to fetch profile');
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>;
      return rejectWithValue(axiosError.response?.data?.message || 'Failed to fetch profile');
    }
  }
);

// Async thunk for initializing auth state from storage
export const initializeAuthAsync = createAsyncThunk(
  'auth/initialize',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const accessToken = getAccessToken();
      const refreshTokenValue = getRefreshToken();
      const userData = localStorage.getItem('user');
      
      if (accessToken && userData) {
        // Parse user data to validate JSON format
        JSON.parse(userData);
        
        // Verify token is still valid by fetching profile
        try {
          const profileResult = await dispatch(fetchProfileAsync()).unwrap();
          return {
            user: profileResult,
            accessToken,
            refreshToken: refreshTokenValue || null,
          };
        } catch {
          // Try to refresh token if profile fetch fails
          if (refreshTokenValue) {
            try {
              await dispatch(refreshTokenAsync()).unwrap();
              const refreshedProfile = await dispatch(fetchProfileAsync()).unwrap();
              return {
                user: refreshedProfile,
                accessToken: getAccessToken() || null,
                refreshToken: getRefreshToken() || null,
              };
            } catch {
              // Refresh failed, clear auth
              return rejectWithValue('Session expired');
            }
          }
          return rejectWithValue('Session expired');
        }
      } else if (refreshTokenValue) {
        // Try to refresh if we have refresh token but no access token
        try {
          await dispatch(refreshTokenAsync()).unwrap();
          const profile = await dispatch(fetchProfileAsync()).unwrap();
          return {
            user: profile,
            accessToken: getAccessToken() || null,
            refreshToken: getRefreshToken() || null,
          };
        } catch {
          return rejectWithValue('Session expired');
        }
      }
      
      return rejectWithValue('No active session');
    } catch {
      return rejectWithValue('Failed to initialize auth');
    }
  }
);

// Create the auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Clear error
    clearError: (state) => {
      state.error = null;
      state.billingBlock = null;
    },
    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Update user data
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    // Reset auth state
    resetAuth: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.error = null;
      state.requiresBranchSelection = false;
      state.assignedBranches = [];
      state.billingBlock = null;
      clearAllTokens();
      localStorage.removeItem('user');
    },
    // Clear the pending branch-selection flag (e.g. after navigating away)
    clearBranchSelection: (state) => {
      state.requiresBranchSelection = false;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.billingBlock = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.initialized = true;
        state.requiresBranchSelection = !!action.payload.requiresBranchSelection;
        state.assignedBranches = action.payload.assignedBranches || [];
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = failureMessage(action.payload, 'Login failed');
        state.billingBlock = failureBilling(action.payload);
        state.initialized = true;
      });

    builder
      .addCase(qrLoginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.billingBlock = null;
      })
      .addCase(qrLoginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.initialized = true;
        state.requiresBranchSelection = !!action.payload.requiresBranchSelection;
        state.assignedBranches = action.payload.assignedBranches || [];
      })
      .addCase(qrLoginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = failureMessage(action.payload, 'QR login failed');
        state.billingBlock = failureBilling(action.payload);
        state.initialized = true;
      });

    // Select branch (scoped token)
    builder
      .addCase(selectBranchAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(selectBranchAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.initialized = true;
        state.requiresBranchSelection = false;
      })
      .addCase(selectBranchAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Super Admin Login
    builder
      .addCase(superAdminLoginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(superAdminLoginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.error = null;
        state.initialized = true;
      })
      .addCase(superAdminLoginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.initialized = true;
      });
    
    // Logout
    builder
      .addCase(logoutAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.error = null;
      })
      .addCase(logoutAsync.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      });
    
    // Refresh token
    builder
      .addCase(refreshTokenAsync.fulfilled, (state, action) => {
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshTokenAsync.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
      });
    
    // Fetch profile
    builder
      .addCase(fetchProfileAsync.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfileAsync.rejected, () => {
        // Don't clear auth on profile fetch failure - might be temporary
      });
    
    // Initialize auth
    builder
      .addCase(initializeAuthAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(initializeAuthAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.initialized = true;
        state.error = null;
        state.assignedBranches = action.payload.user?.assignedBranches || [];
      })
      .addCase(initializeAuthAsync.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.initialized = true;
        // Clear storage on initialization failure
        clearAllTokens();
        localStorage.removeItem('user');
      });
  },
});

export const { clearError, setLoading, updateUser, resetAuth, clearBranchSelection } = authSlice.actions;
export default authSlice.reducer;
