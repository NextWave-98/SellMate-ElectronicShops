import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap";

const CustomerDisplayPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session")?.trim() ?? "";
  const [state, setState] = useState<CustomerDisplayState | null>(
    sessionId ? readCustomerDisplayState(sessionId) : null,
  );
  const [tick, setTick] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = document.querySelector(`link[href="${FONT_HREF}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const apply = (next: CustomerDisplayState) => {
      if (next.sessionId !== sessionId) return;
      setState(next);
      setTick((t) => t + 1);
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

  // Scroll only the product list   keep total pinned at top
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [state?.items.length, state?.lastItem?.id, state?.updatedAt]);

  if (!sessionId) {
    return (
      <div
        className="h-dvh flex items-center justify-center p-8 overflow-hidden"
        style={{
          fontFamily: '"DM Sans", system-ui, sans-serif',
          background: "#0a0c10",
          color: "#e8eaef",
        }}
      >
        <p className="text-xl text-center opacity-60">
          Open this screen from POS using{" "}
          <span className="font-semibold opacity-100">Customer display</span>.
        </p>
      </div>
    );
  }

  const display = state ?? emptyState(sessionId);
  const isSuccess = display.status === "success";
  const hasItems = display.items.length > 0;
  const lastItemId =
    display.lastItem?.id ??
    (hasItems ? display.items[display.items.length - 1]?.id : undefined);
  const showCart = hasItems || (isSuccess && hasItems);

  return (
    <div
      className="h-dvh max-h-dvh flex flex-col select-none overflow-hidden relative"
      style={
        {
          fontFamily: '"DM Sans", system-ui, sans-serif',
          background: "#07090d",
          color: "#f2f3f7",
          ["--cfd-gold" as string]: "#e8b86d",
        } as React.CSSProperties
      }
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 15% -10%, rgba(232,184,109,0.14), transparent 55%),
            radial-gradient(ellipse 60% 40% at 95% 20%, rgba(90,140,180,0.10), transparent 50%),
            radial-gradient(ellipse 50% 35% at 50% 100%, rgba(232,184,109,0.06), transparent 60%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Fixed top: brand + always-visible total */}
      <div className="relative z-10 shrink-0 px-6 sm:px-10 lg:px-14 pt-5 sm:pt-6 pb-3">
        <header className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p
              className="text-[10px] sm:text-[11px] uppercase tracking-[0.35em] mb-1"
              style={{ color: "rgba(232,184,109,0.75)" }}
            >
              Your order
            </p>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl leading-[1.05] truncate"
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontWeight: 400,
              }}
            >
              {display.businessName || "Welcome"}
            </h1>
          </div>

          {(isSuccess || display.status === "payment") && (
            <div
              className="shrink-0 mt-1 px-3 py-1.5 text-xs sm:text-sm font-medium tracking-wide"
              style={{
                borderRadius: 999,
                background: isSuccess
                  ? "rgba(52, 211, 153, 0.12)"
                  : "rgba(251, 191, 36, 0.12)",
                color: isSuccess ? "#6ee7b7" : "#fcd34d",
                border: `1px solid ${isSuccess ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)"}`,
              }}
            >
              {isSuccess ? "Paid   thank you" : "Payment in progress"}
            </div>
          )}
        </header>

        {/* TOTAL pinned at top   never pushed off-screen */}
        {(hasItems || isSuccess) && (
          <div
            key={tick}
            className="rounded-2xl px-5 sm:px-7 py-4 sm:py-5"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              animation: "cfdRise 0.35s ease-out",
            }}
          >
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p
                  className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] mb-1"
                  style={{ color: "rgba(242,243,247,0.4)" }}
                >
                  Total due
                </p>
                <div
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                  style={{ color: "rgba(242,243,247,0.45)" }}
                >
                  <span>
                    {display.itemCount} item
                    {display.itemCount === 1 ? "" : "s"}
                  </span>
                  {hasItems && (
                    <span className="tabular-nums">
                      Subtotal {formatCurrency(display.subtotal)}
                    </span>
                  )}
                  {display.discount > 0 && (
                    <span className="tabular-nums" style={{ color: "#6ee7b7" }}>
                      −{formatCurrency(display.discount)} off
                    </span>
                  )}
                </div>
              </div>
              <p
                className="tabular-nums tracking-tight leading-none shrink-0"
                style={{
                  fontFamily: '"Instrument Serif", Georgia, serif',
                  fontSize: "clamp(2.25rem, 6vw, 3.75rem)",
                  color: "#f07167",
                  textShadow: "0 0 40px rgba(240,113,103,0.25)",
                }}
              >
                {formatCurrency(display.total)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Products: only this area scrolls */}
      <main className="relative z-10 flex-1 min-h-0 flex flex-col px-6 sm:px-10 lg:px-14 pb-5 sm:pb-6">
        {!hasItems && !isSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <p
              className="text-3xl sm:text-4xl"
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                color: "rgba(242,243,247,0.85)",
              }}
            >
              Ready when you are
            </p>
            <p
              className="text-base sm:text-lg"
              style={{ color: "rgba(242,243,247,0.4)" }}
            >
              Items will appear here as they are scanned
            </p>
          </div>
        ) : isSuccess && !hasItems ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <p
              className="text-5xl sm:text-6xl"
              style={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                color: "#6ee7b7",
              }}
            >
              Thank you
            </p>
            <p className="text-xl" style={{ color: "rgba(242,243,247,0.45)" }}>
              Have a wonderful day
            </p>
          </div>
        ) : showCart ? (
          <section className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div
              className="hidden sm:grid grid-cols-[minmax(0,1fr)_7.5rem_5rem_8.5rem] gap-3 px-1 pb-2.5 text-[10px] uppercase tracking-[0.22em] shrink-0"
              style={{
                color: "rgba(242,243,247,0.35)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span>Product</span>
              <span className="text-right">Price</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Amount</span>
            </div>

            <div
              ref={listRef}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain mt-2.5 space-y-2 pr-1"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {display.items.map((item, index) => {
                const isLatest = item.id === lastItemId;
                return (
                  <div
                    key={`${item.id}-${index}`}
                    className="px-4 sm:px-5 py-3 sm:py-3.5 transition-all duration-300"
                    style={{
                      borderRadius: 16,
                      background: isLatest
                        ? "linear-gradient(135deg, rgba(232,184,109,0.14), rgba(255,255,255,0.04))"
                        : "rgba(255,255,255,0.025)",
                      border: isLatest
                        ? "1px solid rgba(232,184,109,0.35)"
                        : "1px solid rgba(255,255,255,0.05)",
                      boxShadow: isLatest
                        ? "0 0 0 1px rgba(232,184,109,0.08), 0 12px 40px rgba(0,0,0,0.25)"
                        : "none",
                      animation: isLatest
                        ? `cfdPulse 0.55s ease-out`
                        : undefined,
                    }}
                  >
                    <div className="sm:hidden space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p
                            className="font-semibold leading-snug break-words text-base"
                            style={{
                              color: isLatest
                                ? "#fff"
                                : "rgba(242,243,247,0.9)",
                            }}
                          >
                            {item.name}
                          </p>
                          {isLatest && (
                            <p
                              className="text-[10px] uppercase tracking-[0.2em] mt-1"
                              style={{ color: "var(--cfd-gold)" }}
                            >
                              Just added
                            </p>
                          )}
                        </div>
                        <p
                          className="tabular-nums font-semibold shrink-0 text-base"
                          style={{
                            color: isLatest ? "var(--cfd-gold)" : "#fff",
                          }}
                        >
                          {formatCurrency(item.lineTotal)}
                        </p>
                      </div>
                      <p
                        className="text-sm tabular-nums"
                        style={{ color: "rgba(242,243,247,0.45)" }}
                      >
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>

                    <div className="hidden sm:grid grid-cols-[minmax(0,1fr)_7.5rem_5rem_8.5rem] gap-3 items-center">
                      <div className="min-w-0">
                        <p
                          className="font-semibold truncate"
                          style={{
                            fontSize: isLatest ? "1.2rem" : "1.05rem",
                            color: isLatest
                              ? "#fff"
                              : "rgba(242,243,247,0.88)",
                          }}
                        >
                          {item.name}
                        </p>
                        {isLatest && (
                          <p
                            className="text-[10px] uppercase tracking-[0.2em] mt-0.5"
                            style={{ color: "var(--cfd-gold)" }}
                          >
                            Just added
                          </p>
                        )}
                      </div>
                      <p
                        className="text-right tabular-nums text-base"
                        style={{ color: "rgba(242,243,247,0.55)" }}
                      >
                        {formatCurrency(item.price)}
                      </p>
                      <p
                        className="text-right tabular-nums text-base"
                        style={{ color: "rgba(242,243,247,0.55)" }}
                      >
                        × {item.quantity}
                      </p>
                      <p
                        className="text-right tabular-nums font-semibold text-lg"
                        style={{
                          color: isLatest ? "var(--cfd-gold)" : "#fff",
                        }}
                      >
                        {formatCurrency(item.lineTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>

      <style>{`
        @keyframes cfdPulse {
          0% { transform: scale(0.985); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes cfdRise {
          0% { transform: translateY(4px); opacity: 0.75; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default CustomerDisplayPage;
