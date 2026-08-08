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
  lastItem: null,
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <p className="text-xl text-slate-400 text-center">
          Open this screen from POS using{" "}
          <span className="text-white font-semibold">Customer display</span>.
        </p>
      </div>
    );
  }

  const display = state ?? emptyState(sessionId);
  const isSuccess = display.status === "success";
  const hasItems = display.items.length > 0;
  const lastItem =
    display.lastItem ??
    (hasItems ? display.items[display.items.length - 1] : null);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none">
      {/* Shop header */}
      <header className="px-6 sm:px-10 py-5 border-b border-zinc-800 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.25em] text-zinc-500">
            Customer Display
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold truncate mt-0.5">
            {display.businessName || "Your Order"}
          </h1>
        </div>
        {isSuccess && (
          <span className="shrink-0 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-semibold">
            Payment complete
          </span>
        )}
        {display.status === "payment" && !isSuccess && (
          <span className="shrink-0 px-4 py-2 rounded-full bg-amber-500/20 text-amber-300 text-sm font-semibold">
            Processing payment…
          </span>
        )}
      </header>

      <main className="flex-1 flex flex-col px-6 sm:px-10 py-6 sm:py-8 overflow-hidden">
        {!hasItems && !isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4">
            <ShoppingBag className="w-16 h-16 opacity-40" />
            <p className="text-2xl font-medium text-zinc-400">
              Waiting for items…
            </p>
            <p className="text-zinc-600">
              Selected products will appear here.
            </p>
          </div>
        ) : isSuccess && !hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <p className="text-5xl font-bold text-emerald-400">Thank you!</p>
            <p className="text-xl text-zinc-400">Have a great day.</p>
          </div>
        ) : (
          <>
            {/* Last selected product — pole-display style */}
            <section className="flex-1 flex flex-col justify-center min-h-0">
              {lastItem ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 px-6 sm:px-10 py-8 sm:py-12 text-center">
                  <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-zinc-500 mb-4">
                    Selected item
                  </p>
                  <p className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight break-words">
                    {lastItem.name}
                  </p>
                  <div className="mt-6 sm:mt-8 flex flex-wrap items-end justify-center gap-x-10 gap-y-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                        Price
                      </p>
                      <p className="text-3xl sm:text-4xl font-semibold tabular-nums text-zinc-100">
                        {formatCurrency(lastItem.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                        Qty
                      </p>
                      <p className="text-3xl sm:text-4xl font-semibold tabular-nums text-zinc-100">
                        × {lastItem.quantity}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                        Line
                      </p>
                      <p className="text-3xl sm:text-4xl font-semibold tabular-nums text-amber-300">
                        {formatCurrency(lastItem.lineTotal)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Compact recent lines */}
              {display.items.length > 1 && (
                <div className="mt-5 max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {display.items
                    .slice(-5)
                    .reverse()
                    .map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-4 text-sm sm:text-base px-3 py-2 rounded-xl ${
                          lastItem?.id === item.id
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-500"
                        }`}
                      >
                        <span className="truncate">
                          {item.name}{" "}
                          <span className="text-zinc-600">×{item.quantity}</span>
                        </span>
                        <span className="tabular-nums shrink-0">
                          {formatCurrency(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            {/* LED-style total — matches classic pole / rear display */}
            <footer className="mt-6 pt-6 border-t border-zinc-800">
              {display.discount > 0 && (
                <div className="flex justify-between text-base text-emerald-400 mb-3">
                  <span>Discount</span>
                  <span className="tabular-nums">
                    − {formatCurrency(display.discount)}
                  </span>
                </div>
              )}
              <div className="rounded-2xl bg-zinc-950 border border-zinc-800 px-6 py-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                    Total
                  </p>
                  <p className="text-zinc-500 text-sm mt-1">
                    {display.itemCount} item
                    {display.itemCount === 1 ? "" : "s"}
                  </p>
                </div>
                <p
                  className="text-5xl sm:text-6xl lg:text-7xl font-bold tabular-nums tracking-tight text-red-500"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
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
