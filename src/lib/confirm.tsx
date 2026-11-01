import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** show the confirm button in destructive red styling */
  danger?: boolean;
}

/**
 * Promise-based replacement for the native window.confirm().
 * Renders a styled modal and resolves true (confirm) / false (cancel).
 *
 *   if (!(await confirmDialog('Delete this item?'))) return;
 */
export function confirmDialog(input: string | ConfirmOptions): Promise<boolean> {
  const opts: ConfirmOptions =
    typeof input === 'string' ? { message: input } : input;

  return new Promise<boolean>((resolve) => {
    const host = document.createElement('div');
    host.setAttribute('data-slot', 'confirm-dialog');
    host.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:auto;';
    document.body.appendChild(host);
    const root = createRoot(host);

    const close = (result: boolean) => {
      root.unmount();
      host.remove();
      resolve(result);
    };

    root.render(<ConfirmModal opts={opts} onClose={close} />);
  });
}

function ConfirmModal({
  opts,
  onClose,
}: {
  opts: ConfirmOptions;
  onClose: (result: boolean) => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // trigger enter transition
    const t = requestAnimationFrame(() => setOpen(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'Enter') onClose(true);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const {
    title = 'Please confirm',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = true,
  } = opts;

  return (
    <div
      data-slot="confirm-dialog"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      onPointerDownCapture={(e) => e.stopPropagation()}
      onMouseDownCapture={(e) => e.stopPropagation()}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-150 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={() => onClose(false)}
      />
      <div
        className={`relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl transition-all duration-150 ${
          open ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => onClose(false)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelText}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => onClose(true)}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-400'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default confirmDialog;
