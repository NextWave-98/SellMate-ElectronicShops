export type PrintPdfPageSize = 'A5-landscape';

/**
 * Opens a PDF blob for printing. For fragile courier labels, wraps the PDF in a
 * minimal HTML document with @page { size: A5 landscape } so browser print preview
 * defaults to landscape instead of portrait A5.
 */
export function printPdfBlob(blob: Blob, options?: { pageSize?: PrintPdfPageSize }): void {
  const blobUrl = URL.createObjectURL(blob);

  if (options?.pageSize === 'A5-landscape') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      URL.revokeObjectURL(blobUrl);
      throw new Error('Please allow popups to print labels');
    }

    const escapedUrl = blobUrl.replace(/"/g, '&quot;');
    printWindow.document.open();
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Print shipping label</title>
  <style>
    @page { size: A5 landscape; margin: 4mm; }
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
    embed { display: block; width: 100vw; height: 100vh; border: 0; object-fit: contain; }
    @media print {
      html, body {
        width: 210mm;
        height: 148mm;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      embed {
        width: 202mm;
        height: 136mm;
        max-width: 202mm;
        max-height: 136mm;
      }
    }
  </style>
</head>
<body>
  <embed src="${escapedUrl}" type="application/pdf" />
  <script>
    window.addEventListener('afterprint', () => window.close());
    setTimeout(() => { window.focus(); window.print(); }, 600);
  </script>
</body>
</html>`);
    printWindow.document.close();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return;
  }

  const newWindow = window.open(blobUrl, '_blank');
  if (!newWindow) {
    URL.revokeObjectURL(blobUrl);
    throw new Error('Please allow popups to print labels');
  }

  newWindow.onload = () => {
    newWindow.print();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
}
