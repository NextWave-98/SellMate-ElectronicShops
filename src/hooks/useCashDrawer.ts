import { useCallback } from 'react';
import useFetch from './useFetch';

export type DrawerStatus = 'OPEN' | 'CLOSED';

export interface CashDrawerRecord {
  id: string;
  status: DrawerStatus;
  openingBalance: number;
  closingBalance: number | null;
  expectedClosingBalance: number;
  variance: number | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: string;
  closedBy: string | null;
  notes: string | null;
}

export interface DayBalanceSummary {
  /** null when no drawer has been opened for the requested day */
  drawer: CashDrawerRecord | null;
  todaySales: {
    totalSalesCount: number;
    totalRevenue: number;
    totalPOSSalesCount: number;
    totalPOSRevenue: number;
    totalDiscounts: number;
    statusBreakdown: {
      completed: number;
      pending: number;
      cancelled: number;
      refunded: number;
    };
  };
  paymentBreakdown: {
    cash: number;
    card: number;
    bankTransfer: number;
    mobilePayment: number;
    other: number;
  };
  cashFlow: {
    openingBalance: number;
    cashSalesReceived: number;
    totalExpectedCash: number;
    closingBalance: number | null;
    variance: number | null;
  };
}

const useCashDrawer = () => {
  const fetch = useFetch();

  const openDrawer = useCallback(
    async (locationId: string, openingBalance: number, notes?: string) => {
      return fetch.fetchData({
        endpoint: '/cash-drawer/open',
        method: 'POST',
        data: { locationId, openingBalance, notes },
      });
    },
    [fetch]
  );

  const closeDrawer = useCallback(
    async (drawerId: string, closingBalance: number, notes?: string) => {
      return fetch.fetchData({
        endpoint: `/cash-drawer/${drawerId}/close`,
        method: 'POST',
        data: { closingBalance, notes },
      });
    },
    [fetch]
  );

  const getActiveDrawer = useCallback(
    async (locationId: string) => {
      return fetch.fetchData({
        endpoint: `/cash-drawer/active?locationId=${locationId}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetch]
  );

  const getDayBalance = useCallback(
    async (locationId: string, date?: string) => {
      const params = new URLSearchParams({ locationId });
      if (date) params.append('date', date);
      return fetch.fetchData({
        endpoint: `/cash-drawer/day-balance?${params.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetch]
  );

  const getDrawerHistory = useCallback(
    async (locationId: string, page = 1, limit = 20) => {
      const params = new URLSearchParams({ locationId, page: String(page), limit: String(limit) });
      return fetch.fetchData({
        endpoint: `/cash-drawer/history?${params.toString()}`,
        method: 'GET',
        silent: true,
      });
    },
    [fetch]
  );

  return {
    openDrawer,
    closeDrawer,
    getActiveDrawer,
    getDayBalance,
    getDrawerHistory,
    loading: fetch.loading,
  };
};

export default useCashDrawer;
