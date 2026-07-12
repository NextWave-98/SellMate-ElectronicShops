/**
 * Token Storage Utility
 * Centralized token management using sessionStorage
 * SessionStorage clears when the browser tab is closed, providing better security
 */

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * Store access token in sessionStorage
 */
export const setAccessToken = (token: string): void => {
  try {
   localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
  } catch (error) {
    console.error('[tokenStorage] Error setting access token:', error);
  }
};

/**
 * Store refresh token in sessionStorage
 */
export const setRefreshToken = (token: string): void => {
  try {
   localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
  } catch (error) {
    console.error('[tokenStorage] Error setting refresh token:', error);
  }
};

/**
 * Get access token from sessionStorage
 */
export const getAccessToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('[tokenStorage] Error getting access token:', error);
    return null;
  }
};

/**
 * Get refresh token from sessionStorage
 */
export const getRefreshToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[tokenStorage] Error getting refresh token:', error);
    return null;
  }
};

/**
 * Remove access token from sessionStorage
 */
export const removeAccessToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
  } catch (error) {
    console.error('[tokenStorage] Error removing access token:', error);
  }
};

/**
 * Remove refresh token from sessionStorage
 */
export const removeRefreshToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
  } catch (error) {
    console.error('[tokenStorage] Error removing refresh token:', error);
  }
};

/**
 * Clear all tokens from sessionStorage
 */
export const clearAllTokens = (): void => {
  try {
    removeAccessToken();
    removeRefreshToken();
  } catch (error) {
    console.error('[tokenStorage] Error clearing tokens:', error);
  }
};

/**
 * Check if access token exists
 */
export const hasAccessToken = (): boolean => {
  return !!getAccessToken();
};

/**
 * Check if refresh token exists
 */
export const hasRefreshToken = (): boolean => {
  return !!getRefreshToken();
};
