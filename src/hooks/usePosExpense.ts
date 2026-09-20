import { useCallback } from "react";
import useFetch from "./useFetch";

export interface PosExpenseRecord {
  id: string;
  locationId: string;
  amount: number;
  category: string;
  note?: string | null;
  status: "POSTED" | "VOID";
  createdAt: string;
  createdBy?: { id: string; name?: string };
}

export interface PosDaySummary {
  date: string;
  locationId: string;
  timezone: string;
  salesCount: number;
  revenue: number;
  cogs: number;
  refunds: number;
  cashRefunds: number;
  pettyExpenses: number;
  grossProfit: number;
  netProfit: number;
}

const usePosExpense = () => {
  const { fetchData } = useFetch();

  const listExpenses = useCallback(
    async (locationId: string) => {
      return fetchData({
        endpoint: `/pos/expenses?locationId=${encodeURIComponent(locationId)}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  const createExpense = useCallback(
    async (payload: {
      locationId: string;
      amount: number;
      category?: string;
      note?: string;
    }) => {
      return fetchData({
        endpoint: "/pos/expenses",
        method: "POST",
        data: payload,
        silent: true,
      });
    },
    [fetchData],
  );

  const voidExpense = useCallback(
    async (id: string) => {
      return fetchData({
        endpoint: `/pos/expenses/${id}`,
        method: "DELETE",
        silent: true,
      });
    },
    [fetchData],
  );

  const getDaySummary = useCallback(
    async (locationId: string) => {
      return fetchData({
        endpoint: `/pos/expenses/day-summary?locationId=${encodeURIComponent(locationId)}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  return { listExpenses, createExpense, voidExpense, getDaySummary };
};

export default usePosExpense;
