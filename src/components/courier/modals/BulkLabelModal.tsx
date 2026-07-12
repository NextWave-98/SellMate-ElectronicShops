import { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type Variant = 'orange' | 'blue';
type LabelSize = 'xsm' | 'sm' | 'md';
type LabelFormat = 'standard' | 'fragile';

const getThemeClasses = (variant: Variant) => {
  if (variant === 'blue') {
    return {
      radioInput: 'text-blue-600 focus:ring-blue-500',
      printButton: 'border-blue-300 text-blue-700 hover:bg-blue-50',
      downloadButton: 'bg-blue-600 hover:bg-blue-700',
    };
  }
  return {
    radioInput: 'text-orange-600 focus:ring-orange-500',
    printButton: 'border-orange-300 text-orange-700 hover:bg-orange-50',
    downloadButton: 'bg-orange-600 hover:bg-orange-700',
  };
};

export const BulkLabelModal = ({
  shipmentCount,
  onClose,
  onPrint,
  onDownload,
  variant = 'orange',
  loading = false,
}: {
  shipmentCount: number;
  onClose: () => void;
  onPrint: (size: LabelSize, format: LabelFormat) => void;
  onDownload: (size: LabelSize, format: LabelFormat) => void;
  variant?: Variant;
  loading?: boolean;
}) => {
  const theme = getThemeClasses(variant);
  const [selectedSize, setSelectedSize] = useState<LabelSize>('md');
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat>('fragile');

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !loading) onClose(); }}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Bulk Labels — {shipmentCount} shipment{shipmentCount !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            Choose label format and size, then print or download all selected shipments in one PDF.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4 pb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Label Format
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="standard"
                  checked={selectedFormat === 'standard'}
                  onChange={(e) => setSelectedFormat(e.target.value as LabelFormat)}
                  className={theme.radioInput}
                  disabled={loading}
                />
                <span>Standard courier label</span>
              </label>
              <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  value="fragile"
                  checked={selectedFormat === 'fragile'}
                  onChange={(e) => setSelectedFormat(e.target.value as LabelFormat)}
                  className={theme.radioInput}
                  disabled={loading}
                />
                <span>Fragile Sinhala label (A5 landscape)</span>
              </label>
            </div>
          </div>

          {selectedFormat === 'standard' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Label Size
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="xsm"
                    checked={selectedSize === 'xsm'}
                    onChange={(e) => setSelectedSize(e.target.value as LabelSize)}
                    className={theme.radioInput}
                    disabled={loading}
                  />
                  <span>Extra Small (4&quot; x 3&quot;)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="sm"
                    checked={selectedSize === 'sm'}
                    onChange={(e) => setSelectedSize(e.target.value as LabelSize)}
                    className={theme.radioInput}
                    disabled={loading}
                  />
                  <span>Small (4&quot; x 6&quot;)</span>
                </label>
                <label className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="md"
                    checked={selectedSize === 'md'}
                    onChange={(e) => setSelectedSize(e.target.value as LabelSize)}
                    className={theme.radioInput}
                    disabled={loading}
                  />
                  <span>Medium (A4)</span>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 rounded-lg border border-gray-200 bg-gray-50 p-3">
              Printed as one label per sheet: A5 landscape (210 × 148 mm). In the print dialog, choose paper size A5 and orientation Landscape if needed.
            </p>
          )}
        </DialogBody>

        <DialogFooter className="border-t border-gray-200 sm:justify-stretch gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className={`flex-1 flex items-center justify-center gap-2 ${theme.printButton}`}
            onClick={() => onPrint(selectedSize, selectedFormat)}
            disabled={loading}
          >
            <Printer className="w-4 h-4" />
            {loading ? 'Processing...' : 'Print Labels'}
          </Button>
          <Button
            className={`flex-1 text-white flex items-center justify-center gap-2 ${theme.downloadButton}`}
            onClick={() => onDownload(selectedSize, selectedFormat)}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkLabelModal;
