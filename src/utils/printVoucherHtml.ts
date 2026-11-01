import type { VoucherPaperFormat } from '../components/common/VoucherFormatModal';

/** Print HTML voucher via hidden iframe (desktop) or new tab (iOS). */
export function printVoucherHtml(html: string, format: VoucherPaperFormat = '80mm'): void {
  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

  if (isIOS) {
    const w = window.open('', '_blank');
    if (w) {
      w.document.open();
      w.document.write(html);
      w.document.close();
      setTimeout(() => {
        try {
          w.focus();
          w.print();
        } catch {
          /* ignore */
        }
      }, 400);
    }
    return;
  }

  const paperWidthCss = format === 'a4' ? '210mm' : format === '54mm' ? '54mm' : '80mm';
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;width:${paperWidthCss};height:1px;top:-9999px;left:-9999px;border:none;opacity:0;`;
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const cleanup = () => {
    try {
      document.body.removeChild(iframe);
    } catch {
      /* ignore */
    }
  };
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(cleanup, 1500);
    }
  }, 250);
}
