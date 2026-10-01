/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Silent access-token refresh for every request made with the global axios
 * instance (useFetch and friends).
 *
 * Before this, the first request after the access token expired got a 401 and
 * useFetch cleared the session and redirected to /login   even though a valid
 * 7-day refresh token was sitting in storage. At the till that meant a lost
 * cart in the middle of a sale.
 *
 * Now a 401 on an authenticated request triggers ONE shared refresh call
 * (concurrent 401s wait for the same promise, so the server's single stored
 * refresh token is not rotated twice), then the original request is retried
 * once. If the refresh fails, the 401 propagates and the existing logout /
 * redirect handling in useFetch runs exactly as before.
 */
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getRefreshToken, setAccessToken, setRefreshToken } from './tokenStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

// Auth endpoints never trigger a refresh (wrong password must stay a 401).
const NO_REFRESH = /\/auth\/(login|admin\/login|platform-staff\/login|qr-login|refresh-token|logout)\b/;

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await axios.post(
      `${BASE_URL}/auth/refresh-token`,
      { refreshToken },
      { headers: { 'Content-Type': 'application/json' }, _skipAuthRefresh: true } as any,
    );
    const data = res?.data?.data;
    if (data?.accessToken) {
      setAccessToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return data.accessToken as string;
    }
  } catch {
    /* fall through   caller keeps the original 401 */
  }
  return null;
}

let installed = false;

export function installAuthRefreshInterceptor(): void {
  if (installed) return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const cfg = error.config as (InternalAxiosRequestConfig & { _retried?: boolean; _skipAuthRefresh?: boolean }) | undefined;
      const status = error.response?.status;
      if (status !== 401 || !cfg || cfg._retried || cfg._skipAuthRefresh) throw error;
      if (NO_REFRESH.test(String(cfg.url || ''))) throw error;

      const headers: any = cfg.headers || {};
      const hadAuth =
        (typeof headers.get === 'function' && headers.get('Authorization')) ||
        headers.Authorization ||
        headers.authorization;
      if (!hadAuth) throw error; // anonymous request   nothing to refresh

      if (!refreshing) {
        refreshing = refreshAccessToken().finally(() => {
          // Let every waiter read the result before the next cycle can start.
          setTimeout(() => {
            refreshing = null;
          }, 0);
        });
      }
      const token = await refreshing;
      if (!token) throw error;

      cfg._retried = true;
      if (typeof headers.set === 'function') {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        cfg.headers = { ...headers, Authorization: `Bearer ${token}` } as any;
      }
      return axios.request(cfg);
    },
  );
}
