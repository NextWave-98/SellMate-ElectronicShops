import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download } from 'lucide-react';

export type VoucherPaperFormat = 'a4' | '80mm' | '54mm';
export type VoucherAction = 'print' | 'download';

interface VoucherFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  action?: VoucherAction;
  label?: string;
  title?: string;
  onConfirm: (format: VoucherPaperFormat) => void | Promise<void>;
}

const FORMATS: { id: VoucherPaperFormat; label: string; detail: string }[] = [
  { id: 'a4', label: 'A4', detail: '210 × 297 mm – full page' },
  { id: '80mm', label: '80mm', detail: '80 mm thermal receipt' },
  { id: '54mm', label: '54mm', detail: '54 mm mini thermal' },
];

export default function VoucherFormatModal({
  isOpen,
  onClose,
  action = 'print',
  label,
  title,
  onConfirm,
}: VoucherFormatModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<VoucherPaperFormat>('80mm');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedFormat('80mm');
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

  const modal = (
    <div
      data-slot="voucher-format-modal"
      className="fixed inset-0 z-[1000] pointer-events-auto flex items-center justify-center p-4"
      // Keep nested Radix dialogs from treating these clicks as "outside"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Backdrop: visual only  close only via X / Cancel */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
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
              <h2 className="text-lg font-bold text-gray-900">
                {title || (isPrint ? 'Print Receipt' : 'Download Receipt')}
              </h2>
              {label && <p className="text-xs text-gray-500 truncate max-w-[240px]">{label}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFormat(f.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition ${
                selectedFormat === f.id
                  ? 'border-[#1e3a8a] bg-blue-50 ring-1 ring-[#1e3a8a]'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-gray-900">{f.label}</div>
              <div className="text-xs text-gray-500">{f.detail}</div>
            </button>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60"
          >
            {submitting ? 'Working…' : isPrint ? 'Print' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : modal;
}
