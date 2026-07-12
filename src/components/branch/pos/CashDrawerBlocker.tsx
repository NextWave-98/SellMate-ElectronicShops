import React, { useState } from 'react';
import { AlertTriangle, Wallet, Loader2 } from 'lucide-react';
import useCashDrawer from '../../../hooks/useCashDrawer';
import toast from 'react-hot-toast';

interface CashDrawerBlockerProps {
  locationId: string;
  onDrawerOpened: () => void;
}

const CashDrawerBlocker: React.FC<CashDrawerBlockerProps> = ({ locationId, onDrawerOpened }) => {
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');
  const { openDrawer, loading } = useCashDrawer();

  const handleOpen = async () => {
    const balance = openingBalance.trim() === '' ? 0 : parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error('Please enter a valid opening balance');
      return;
    }
    try {
      const res = await openDrawer(locationId, balance, notes || undefined);
      if (res) {
        toast.success('Cash drawer opened! You can now start POS.');
        onDrawerOpened();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to open cash drawer';
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-orange-50">
      {/* diagonal stripe background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #2563eb 0, #2563eb 1px, transparent 0, transparent 14px)',
          backgroundSize: '20px 20px',
        }}
      />

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-orange-200">
          {/* Header */}
          <div className="bg-orange-500 px-6 py-7 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold">Cash Drawer Not Opened</h2>
            <p className="text-orange-100 text-sm mt-1">Start-of-day setup required before using POS</p>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-4 mb-5">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-sm text-orange-700 leading-relaxed">
                The cash drawer for today has not been opened yet. Please set the opening balance to begin processing sales. Use <strong>0</strong> if you start with no cash in the drawer.
              </p>
            </div>

            <div className="space-y-4">
              {/* Opening Balance */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Opening Balance <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">
                    Rs
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Notes{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Morning shift"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleOpen}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Opening Cash Drawer…
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Open Cash Drawer &amp; Start Day
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CashDrawerBlocker;
