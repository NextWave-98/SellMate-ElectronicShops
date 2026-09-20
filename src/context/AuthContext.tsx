/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import useFetch from '../hooks/useFetch';
import alert from '../utils/alert';
import { useAppDispatch } from '../store/hooks';
import { loginAsync, qrLoginAsync, superAdminLoginAsync, resetAuth } from '../store/authSlice';
import {
  getAccessToken,
  setAccessToken,
  setRefreshToken,
  getRefreshToken,
  clearAllTokens,
} from '../utils/tokenStorage';

/**
 * The message out of a rejected auth thunk.
 *
 * `loginAsync` and `qrLoginAsync` reject with an object when the refusal
 * carries detail worth showing (an unpaid subscription sends the amount, the
 * due date and the bank account). Everything else still rejects with a plain
 * string, so both shapes have to read cleanly.
 */
const rejectionMessage = (payload: unknown, fallback: string): string =>
  (typeof payload === 'string'
    ? payload
    : (payload as { message?: string } | null)?.message) || fallback;

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithQrToken: (qrToken: string) => Promise<User>;
  superAdminLogin: (email: string, password: string, secretKey: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  loading: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: {
    id: string;
    name: string;
    description: string | null;
    permissions: Array<{
      id: string;
      name: string;
      description: string | null;
      module: string;
      action: string;
    }>;
  };
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  businessId?: string | null;
  business?: {
    id: string;
    name: string;
    industryType?: 'ELECTRONICS' | 'CLOTHING' | 'GENERAL' | 'VEHICLE_RENTAL' | 'CAR_WASH' | 'GARAGE';
  };
  // Location fields (backward compatible with branch)
  locationId?: string | null;
  branchId?: string | null; // Deprecated: use locationId
  location?: {
    id: string;
    name: string;
    locationCode: string;
    locationType: string;
    isActive: boolean;
  };
  locationCode?: string | null;
  branch?: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
  };
}

interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const { fetchData: refreshTokenFetch } = useFetch<RefreshTokenResponse>('/auth/refresh-token');

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = getRefreshToken();
      
      if (!refreshTokenValue) {
        return false;
      }

      const response = await refreshTokenFetch({
        method: 'POST',
        data: { refreshToken: refreshTokenValue },
        silent: true,
        showToastOnError: false,
      });

      if (response?.data && response.success !== false) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // Update tokens in sessionStorage
        setAccessToken(accessToken);
        setRefreshToken(newRefreshToken);

        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, []);

  const { fetchData: logoutFetch } = useFetch('/auth/logout');
  const { fetchData: profileFetch } = useFetch<User>('/auth/profile');

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const accessToken = getAccessToken();
        const refreshTokenValue = getRefreshToken();
        const userData = localStorage.getItem('user');

        if (accessToken && userData) {
          // Parse stored user data first
          const parsedUser = JSON.parse(userData);
          
          // Verify token is still valid by fetching profile
          const response = await profileFetch({
            method: 'GET',
            silent: true,
            showToastOnError: false,
          });

          // Check if response is successful (status true or success true)
          if (response && (response.status === true || response.success === true) && response.data) {
            // Ensure branchCode is set from branch.code if not directly available
            const userData = response.data;
            if (!userData.locationCode && userData.location?.locationCode) {
              userData.locationCode = userData.location.locationCode;
            }
            setIsAuthenticated(true);
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else if (refreshTokenValue && (response?.code === 401 || response?.status === false || response?.success === false)) {
            // Only try to refresh token if we got a 401 or explicit failure
            const refreshed = await refreshToken();
            if (refreshed) {
              // After refresh, try to get profile again
              const profileResponse = await profileFetch({
                method: 'GET',
                silent: true,
                showToastOnError: false,
              });
              if (profileResponse && (profileResponse.status === true || profileResponse.success === true) && profileResponse.data) {
                // Ensure branchCode is set from branch.code if not directly available
                const userData = profileResponse.data;
                if (!userData.locationCode && userData.location?.locationCode) {
                  userData.locationCode = userData.location.locationCode;
                }
                setIsAuthenticated(true);
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                setLoading(false);
                return;
              }
            }
            // If refresh failed, clear auth
            clearAuth();
          } else if (!response || response.code === 401 || response.code === 403) {
            // Only clear auth if we got a definitive auth failure
            clearAuth();
          } else {
            // For other cases, use cached user data temporarily
            setIsAuthenticated(true);
            setUser(parsedUser);
          }
        } else if (refreshTokenValue) {
          // Try to refresh if we have refresh token but no access token
          const refreshed = await refreshToken();
          if (refreshed) {
            const profileResponse = await profileFetch({
              method: 'GET',
              silent: true,
              showToastOnError: false,
            });
            if (profileResponse && (profileResponse.status === true || profileResponse.success === true) && profileResponse.data) {
              // Ensure branchCode is set from branch.code if not directly available
              const userData = profileResponse.data;
              if (!userData.locationCode && userData.location?.locationCode) {
                userData.locationCode = userData.location.locationCode;
              }
              setIsAuthenticated(true);
              setUser(userData);
              localStorage.setItem('user', JSON.stringify(userData));
            } else {
              clearAuth();
            }
          } else {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, try to use cached data if tokens exist
        const accessToken = getAccessToken();
        const userData = localStorage.getItem('user');
        if (accessToken && userData) {
          try {
            const parsedUser = JSON.parse(userData);
            setIsAuthenticated(true);
            setUser(parsedUser);
          } catch {
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const clearAuth = () => {
    clearAllTokens();
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const login = async (email: string, password: string): Promise<User> => {
    try {
      console.log('[AuthContext] Starting login process...'); // Debug log
      
      // Dispatch Redux login action which handles tokens, localStorage, and state updates
      const resultAction = await dispatch(loginAsync({ email, password }));
      
      
      
      // Check if login was successful
      if (loginAsync.fulfilled.match(resultAction)) {
        const { user: userData, accessToken, refreshToken } = resultAction.payload;
        
      
        // Update local context state to stay in sync with Redux
        setIsAuthenticated(true);
        setUser(userData);
        
        // Verify tokens are in sessionStorage before returning
        const tokenCheck = getAccessToken();
        if (!tokenCheck) {
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
        }
        
        // Return the user data for immediate use in navigation
        return userData;
      } else {
        // Login failed, extract error message
        const errorMessage = rejectionMessage(resultAction.payload, 'Login failed');
        console.error('[AuthContext] Login failed:', errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[AuthContext] Login error:', error);
      throw error;
    }
  };

  const loginWithQrToken = async (qrToken: string): Promise<User> => {
    try {
      const resultAction = await dispatch(qrLoginAsync({ qrToken }));

      if (qrLoginAsync.fulfilled.match(resultAction)) {
        const { user: userData, accessToken, refreshToken } = resultAction.payload;

        setIsAuthenticated(true);
        setUser(userData);

        const tokenCheck = getAccessToken();
        if (!tokenCheck) {
          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
        }

        return userData;
      }

      const errorMessage = rejectionMessage(resultAction.payload, 'QR login failed');
      throw new Error(errorMessage);
    } catch (error) {
      console.error('[AuthContext] QR login error:', error);
      throw error;
    }
  };

  const superAdminLogin = async (email: string, password: string, secretKey: string) => {
    try {
      // Dispatch Redux action to update Redux state
      const resultAction = await dispatch(superAdminLoginAsync({ email, password, secretKey }));
      
      if (superAdminLoginAsync.fulfilled.match(resultAction)) {
        // Redux action successful, update AuthContext state
        const { user: userData } = resultAction.payload;
        
        // Ensure locationCode is set from location.locationCode if not directly available
        if (!userData.locationCode && userData.location?.locationCode) {
          userData.locationCode = userData.location.locationCode;
        }
        
        setIsAuthenticated(true);
        setUser(userData);
        
        alert.success('Super admin login successful');
      } else {
        // Handle Redux action rejection
        const errorMessage = rejectionMessage(resultAction.payload, 'Super admin login failed');
        alert.error(errorMessage);
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Super admin login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    // Call logout API first while token is still available
    try {
      await logoutFetch({
        method: 'POST',
        silent: true,
        showToastOnError: false,
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }

    // Then clear all local state
    clearAuth();
    dispatch(resetAuth());

    // Force page reload and redirect to login
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, loginWithQrToken, superAdminLogin, logout, refreshToken, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
