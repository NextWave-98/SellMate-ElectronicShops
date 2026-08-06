import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "../../utils/currency";
import {
  CUSTOMER_DISPLAY_CHANNEL,
  type CustomerDisplayState,
  readCustomerDisplayState,
} from "../../lib/customerDisplaySync";

const emptyState = (sessionId: string): CustomerDisplayState => ({
  sessionId,
  items: [],
  itemCount: 0,
  subtotal: 0,
  discount: 0,
  total: 0,
  status: "idle",
  updatedAt: 0,
});

const CustomerDisplayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const [state, setState] = useState<CustomerDisplayState | null>(
    sessionId ? readCustomerDisplayState(sessionId) : null,
  );

  useEffect(() => {
    if (!sessionId) return;

    const apply = (next: CustomerDisplayState) => {
      if (next.sessionId !== sessionId) return;
      setState(next);
    };

    const cached = readCustomerDisplayState(sessionId);
    if (cached) setState(cached);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CUSTOMER_DISPLAY_CHANNEL);
      channel.onmessage = (event: MessageEvent<CustomerDisplayState>) => {
        if (event.data) apply(event.data);
      };
    } catch {
      // fall back to storage events only
    }

    const onStorage = (event: StorageEvent) => {
      if (!event.key?.includes(sessionId) || !event.newValue) return;
      try {
        apply(JSON.parse(event.newValue) as CustomerDisplayState);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, [sessionId]);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-8">
        <p className="text-xl text-slate-300">
          Open this screen from Quick POS using Customer Display.
        </p>
      </div>
    );
  }

  const display = state ?? emptyState(sessionId);
  const isSuccess = display.status === "success";
  const hasItems = display.items.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-8 py-6 border-b border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Customer Display
          </p>
          <h1 className="text-3xl font-bold mt-1">
            {display.businessName || "Your Order"}
          </h1>
        </div>
        {isSuccess && (
          <span className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
            Payment complete
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col px-8 py-6 overflow-hidden">
        {!hasItems && !isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <ShoppingBag className="w-16 h-16 opacity-40" />
            <p className="text-2xl font-medium">Waiting for items…</p>
            <p className="text-slate-500">
              Selected products will appear here.
            </p>
          </div>
        ) : isSuccess && !hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-4xl font-bold text-emerald-400">Thank you!</p>
            <p className="text-xl text-slate-300">Have a great day.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {display.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-6 rounded-2xl bg-slate-900/80 border border-slate-800 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-xl font-semibold truncate">{item.name}</p>
                    <p className="text-slate-400 mt-1">
                      {formatCurrency(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-bold tabular-nums">
                      {item.quantity}
                    </p>
                    <p className="text-slate-300 tabular-nums">
                      {formatCurrency(item.lineTotal)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <footer className="mt-6 pt-6 border-t border-slate-800 space-y-2">
              <div className="flex justify-between text-lg text-slate-300">
                <span>Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(display.subtotal)}
                </span>
              </div>
              {display.discount > 0 && (
                <div className="flex justify-between text-lg text-emerald-400">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    − {formatCurrency(display.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-end pt-2">
                <div>
                  <p className="text-sm uppercase tracking-wider text-slate-400">
                    Total
                  </p>
                  <p className="text-slate-400 text-sm">
                    {display.itemCount} item{display.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p className="text-5xl font-bold tabular-nums text-white">
                  {formatCurrency(display.total)}
                </p>
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
};

export default CustomerDisplayPage;
