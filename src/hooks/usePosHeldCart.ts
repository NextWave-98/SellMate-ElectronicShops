import { useCallback } from "react";
import useFetch from "./useFetch";

export interface HeldCartSnapshot {
  cart: Array<Record<string, unknown>>;
  customer?: {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    loyaltyPoints?: number;
  };
  discountAmount?: string;
  discountType?: "FIXED" | "PERCENTAGE";
  notes?: string;
  loyaltyRedeemInput?: string;
}

export interface PosHeldCartRecord {
  id: string;
  locationId: string;
  heldById: string;
  note?: string | null;
  itemCount: number;
  totalAmount: number;
  cartJson: HeldCartSnapshot;
  createdAt: string;
  heldBy?: { id: string; name?: string; email?: string };
}

const usePosHeldCart = () => {
  const { fetchData } = useFetch();

  const listHeldCarts = useCallback(
    async (locationId: string) => {
      return fetchData({
        endpoint: `/pos/held-carts?locationId=${encodeURIComponent(locationId)}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  const createHeldCart = useCallback(
    async (payload: {
      locationId: string;
      note?: string;
      cartJson: HeldCartSnapshot;
      itemCount: number;
      totalAmount: number;
    }) => {
      return fetchData({
        endpoint: "/pos/held-carts",
        method: "POST",
        data: payload,
        silent: true,
      });
    },
    [fetchData],
  );

  const getHeldCart = useCallback(
    async (id: string) => {
      return fetchData({
        endpoint: `/pos/held-carts/${id}`,
        method: "GET",
        silent: true,
      });
    },
    [fetchData],
  );

  const discardHeldCart = useCallback(
    async (id: string) => {
      return fetchData({
        endpoint: `/pos/held-carts/${id}`,
        method: "DELETE",
        silent: true,
      });
    },
    [fetchData],
  );

  return { listHeldCarts, createHeldCart, getHeldCart, discardHeldCart };
};

export default usePosHeldCart;
