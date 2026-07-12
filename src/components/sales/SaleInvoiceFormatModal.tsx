import { useState, useEffect } from 'react';
import { X, Printer, Download, CheckCircle } from 'lucide-react';
import type { PaperFormat } from '../branch/pos/PrintOptionsModal';

export type InvoiceAction = 'print' | 'download';

interface SaleInvoiceFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: InvoiceAction;
  invoiceLabel?: string;
  onConfirm: (format: PaperFormat) => void | Promise<void>;
}

const FORMATS: { id: PaperFormat; label: string; detail: string; icon: string }[] = [
  { id: 'a4', label: 'A4', detail: '210 × 297 mm – full invoice', icon: '📄' },
  { id: '80mm', label: '80mm', detail: '80 mm thermal receipt', icon: '🧾' },
  { id: '58mm', label: '58mm', detail: '58 mm mini thermal', icon: '📋' },
];

export default function SaleInvoiceFormatModal({
  isOpen,
  onClose,
  action,
  invoiceLabel,
  onConfirm,
}: SaleInvoiceFormatModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<PaperFormat>('a4');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('a4');
      setSubmitting(false);
    }
  }, [isOpen, action]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(selectedFormat);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isPrint = action === 'print';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-format-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPrint ? 'bg-orange-50' : 'bg-purple-50'}`}>
              {isPrint ? (
                <Printer className="w-5 h-5 text-orange-600" />
              ) : (
                <Download className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div>
              <h2 id="invoice-format-title" className="text-lg font-bold text-gray-900">
                {isPrint ? 'Print Invoice' : 'Download Invoice'}
              </h2>
              {invoiceLabel && (
                <p className="text-xs text-gray-500 truncate max-w-[240px]">{invoiceLabel}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">Select paper size, then confirm.</p>
          <div className="flex gap-2 flex-wrap">
            {FORMATS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`flex-1 min-w-[100px] flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'
                  }`}
                >
                  <span className="text-xl">{fmt.icon}</span>
                  <span className={`text-sm font-bold ${isSelected ? 'text-orange-700' : 'text-gray-700'}`}>
                    {fmt.label}
                  </span>
                  <span className="text-[10px] text-gray-500 text-center leading-tight">{fmt.detail}</span>
                  {isSelected && <CheckCircle className="w-3.5 h-3.5 text-orange-500" />}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 ${
                isPrint ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {isPrint ? <Printer className="w-4 h-4" /> : <Download className="w-4 h-4" />}
              {submitting
                ? isPrint
                  ? 'Printing…'
                  : 'Downloading…'
                : isPrint
                  ? `Print (${selectedFormat})`
                  : `Download (${selectedFormat})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
