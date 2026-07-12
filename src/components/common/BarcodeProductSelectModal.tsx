import React from 'react';
import { ScanLine, Package, Wrench, Tag } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ScannedProduct } from '../../hooks/useBarcode';
import { formatCurrency } from '../../utils/currency';

interface BarcodeProductSelectModalProps {
  open: boolean;
  onClose: () => void;
  matches: ScannedProduct[];
  onSelect: (product: ScannedProduct) => void;
  scannedValue?: string;
}

const BarcodeProductSelectModal: React.FC<BarcodeProductSelectModalProps> = ({
  open,
  onClose,
  matches,
  onSelect,
  scannedValue,
}) => {
  if (!open || matches.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-linear-to-r from-indigo-600 to-indigo-700">
          <div className="flex items-center gap-2 text-white">
            <ScanLine className="h-5 w-5" />
            <div>
              <h2 className="text-sm font-semibold">Multiple Products Found</h2>
              {scannedValue && (
                <p className="text-xs text-indigo-200 font-mono mt-0.5">{scannedValue}</p>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            {matches.length} products share this barcode. Select the one to add to cart:
          </p>
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {matches.map((product) => (
              <li key={product.id}>
                <button
                  onClick={() => { onSelect(product); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center shrink-0 transition-colors">
                    {product.isService ? (
                      <Wrench className="w-5 h-5 text-indigo-500" />
                    ) : (
                      <Package className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {product.brand && (
                        <span className="text-xs text-gray-400">{product.brand}</span>
                      )}
                      {product.category && (
                        <span className="text-xs text-gray-400">{product.category}</span>
                      )}
                      {product.isService && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <Wrench className="w-2.5 h-2.5" /> Service
                        </span>
                      )}
                      {!product.isService && product.stock <= 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                          Out of stock
                        </span>
                      )}
                      {!product.isService && product.stock > 0 && (
                        <span className={`text-[10px] font-medium ${product.stock <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                          {product.stock} in stock
                        </span>
                      )}
                    </div>
                    {(product.productCode || product.sku) && (
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {[product.productCode, product.sku].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-gray-400" />
                      <span className="text-sm font-bold text-indigo-700">{formatCurrency(product.unitPrice)}</span>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeProductSelectModal;
