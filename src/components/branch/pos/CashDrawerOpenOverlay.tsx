import React, { useEffect } from 'react';
import { Wallet, CheckCircle } from 'lucide-react';

interface CashDrawerOpenOverlayProps {
  visible: boolean;
  onDone: () => void;
  /** Auto-dismiss delay in ms (default 2800) */
  duration?: number;
}

/**
 * Full-screen blue overlay shown for a few seconds when the
 * cash drawer is triggered to open after a cash sale.
 */
const CashDrawerOpenOverlay: React.FC<CashDrawerOpenOverlayProps> = ({
  visible,
  onDone,
  duration = 2800,
}) => {
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(onDone, duration);
    return () => clearTimeout(t);
  }, [visible, duration, onDone]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-blue-700 animate-fadeIn select-none">
      {/* Pulsing ring */}
      <div className="relative mb-6">
        <span className="absolute inset-0 rounded-full bg-blue-400 opacity-40 animate-ping" />
        <div className="relative w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
          <Wallet className="w-12 h-12 text-white" strokeWidth={1.5} />
        </div>
      </div>

      {/* Main message */}
      <h2 className="text-3xl font-bold text-white tracking-wide mb-2">
        Cash Drawer Opening
      </h2>
      <p className="text-blue-200 text-base mb-8">
        Please take the cash &amp; give change to the customer
      </p>

      {/* Progress bar */}
      <div className="w-56 h-1.5 rounded-full bg-white/30 overflow-hidden">
        <div
          className="h-full bg-white rounded-full"
          style={{ animation: `cashDrawerBar ${duration}ms linear forwards` }}
        />
      </div>

      {/* Dismiss hint */}
      <button
        onClick={onDone}
        className="mt-10 flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors"
      >
        <CheckCircle className="w-4 h-4" />
        Tap to dismiss
      </button>

      <style>{`
        @keyframes cashDrawerBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CashDrawerOpenOverlay;
