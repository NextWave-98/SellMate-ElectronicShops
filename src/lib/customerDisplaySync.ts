/**
 * Syncs POS / Quick POS cart state to a second customer-facing window.
 * Uses BroadcastChannel + localStorage (same-origin only). No server/DB writes.
 */

export const CUSTOMER_DISPLAY_CHANNEL = "pos-customer-display";

export interface CustomerDisplayItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  lineTotal: number;
}

export type CustomerDisplayStatus =
  | "idle"
  | "cart"
  | "payment"
  | "success";

export interface CustomerDisplayState {
  sessionId: string;
  businessName?: string;
  items: CustomerDisplayItem[];
  /** Most recently scanned / selected line — shown large on the pole display. */
  lastItem?: CustomerDisplayItem | null;
  itemCount: number;
  subtotal: number;
  discount: number;
  total: number;
  status: CustomerDisplayStatus;
  updatedAt: number;
}

export function getCustomerDisplayStorageKey(sessionId: string): string {
  return `pos_customer_display_${sessionId}`;
}

export function createCustomerDisplaySessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `cds_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function readCustomerDisplayState(
  sessionId: string,
): CustomerDisplayState | null {
  try {
    const raw = localStorage.getItem(getCustomerDisplayStorageKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as CustomerDisplayState;
  } catch {
    return null;
  }
}

export function publishCustomerDisplay(state: CustomerDisplayState): void {
  try {
    localStorage.setItem(
      getCustomerDisplayStorageKey(state.sessionId),
      JSON.stringify(state),
    );
  } catch {
    // ignore quota / private mode failures
  }

  try {
    const channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
    channel.postMessage(state);
    channel.close();
  } catch {
    // BroadcastChannel unsupported — localStorage still helps on reload
  }
}

export function clearCustomerDisplay(sessionId: string): void {
  const empty: CustomerDisplayState = {
    sessionId,
    items: [],
    lastItem: null,
    itemCount: 0,
    subtotal: 0,
    discount: 0,
    total: 0,
    status: "idle",
    updatedAt: Date.now(),
  };
  publishCustomerDisplay(empty);
  try {
    localStorage.removeItem(getCustomerDisplayStorageKey(sessionId));
  } catch {
    // ignore
  }
}
