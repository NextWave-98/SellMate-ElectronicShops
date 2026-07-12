import { useState } from 'react';

import { Printer, Download } from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import useFetch from '../../../hooks/useFetch';
import { type CourierShipment } from '../../../hooks/useCourier';
import toast from 'react-hot-toast';

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

export const LabelDownloadModal = ({
  shipment,
  onClose,
  onPrint,
  variant = 'orange'
}: {
  shipment: CourierShipment;
  onClose: () => void;
  onPrint?: (size: LabelSize, format: LabelFormat) => void;
  variant?: Variant;
}) => {
  const theme = getThemeClasses(variant);
  const [selectedSize, setSelectedSize] = useState<LabelSize>('md');
  const [selectedFormat, setSelectedFormat] = useState<LabelFormat>('fragile');
  const [isDownloading, setIsDownloading] = useState(false);
  const { fetchData } = useFetch('');

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const labelIdentifier = encodeURIComponent(shipment.shipmentNumber || shipment.id);
      const response = await fetchData({
        endpoint: `/courier/shipments/${labelIdentifier}/label?size=${selectedSize}&format=${selectedFormat}`,
        responseType: 'blob',
        method: 'GET'
      });
      if (response) {
        const blob = response as unknown as Blob;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `label-${shipment.shipmentNumber}-${selectedFormat}-${selectedSize}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success('Label downloaded successfully');
        onClose();
      }
    } catch {
      toast.error('Failed to download label');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,100dvh)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader>
          <DialogTitle>Download Label</DialogTitle>
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
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isDownloading}>Cancel</Button>
          <Button variant="outline" className={`flex-1 flex items-center justify-center gap-2 ${theme.printButton}`} onClick={() => { onPrint?.(selectedSize, selectedFormat); onClose(); }} disabled={isDownloading}>
            <Printer className="w-4 h-4" />Print Label
          </Button>
          <Button className={`flex-1 text-white flex items-center justify-center gap-2 ${theme.downloadButton}`} onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>Generating...</>
            ) : (
              <><Download className="w-4 h-4" />Download</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LabelDownloadModal;
