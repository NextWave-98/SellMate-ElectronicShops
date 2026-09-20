import { useCallback } from "react";
import useFetch from "./useFetch";
import type { HeldCartSnapshot } from "./usePosHeldCart";

export interface PosQuotationRecord {
  id: string;
  quoteNumber: string;
  locationId: string;
  status: "OPEN" | "CONVERTED" | "VOID";
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  note?: string | null;
  itemCount: number;
  totalAmount: number;
  cartJson: HeldCartSnapshot;
  convertedSaleId?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

const usePosQuotation = () => {
  const { fetchData } = useFetch();

  const listQuotations = useCallback(
    async (locationId: string) => {
      return fetchData({
        endpoint: `/pos/quotations?locationId=${encodeURIComponent(locationId)}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  const createQuotation = useCallback(
    async (payload: {
      locationId: string;
      note?: string;
      cartJson: HeldCartSnapshot;
      itemCount: number;
      totalAmount: number;
      customerId?: string;
      customerName?: string;
      customerPhone?: string;
    }) => {
      return fetchData({
        endpoint: "/pos/quotations",
        method: "POST",
        data: payload,
        silent: true,
      });
    },
    [fetchData],
  );

  const getQuotation = useCallback(
    async (id: string) => {
      return fetchData({
        endpoint: `/pos/quotations/${id}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  const convertQuotation = useCallback(
    async (id: string, saleId: string) => {
      return fetchData({
        endpoint: `/pos/quotations/${id}/convert`,
        method: "POST",
        data: { saleId },
        silent: true,
      });
    },
    [fetchData],
  );

  const voidQuotation = useCallback(
    async (id: string) => {
      return fetchData({
        endpoint: `/pos/quotations/${id}`,
        method: "DELETE",
        silent: true,
      });
    },
    [fetchData],
  );

  return {
    listQuotations,
    createQuotation,
    getQuotation,
    convertQuotation,
    voidQuotation,
  };
};

export default usePosQuotation;
