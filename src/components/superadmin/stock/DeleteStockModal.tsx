import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ProductItem } from '../../../hooks/useProduct';
import { useProduct } from '../../../hooks/useProduct';

interface DeleteStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  stockItem: ProductItem | null;
}

export default function DeleteStockModal({ isOpen, onClose, onSuccess, stockItem }: DeleteStockModalProps) {
  const productHook = useProduct();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!stockItem?.id) return;

    setLoading(true);
    try {
      const response = await productHook.deleteProduct(stockItem.id);
      
      if (response?.success) {
        toast.success('Product deleted successfully');
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !stockItem) return null;

  return (
    <div className="glass-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass-modal-panel w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 shrink-0 bg-transparent px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Delete Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this product?
              </h3>
              <p className="text-gray-600 mb-4">
                This will permanently delete the product. This action cannot be undone.
              </p>
         
            </div>
          </div>
               <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600">Product Code:</p>
                <p className="font-semibold text-gray-900">{stockItem.productCode || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-2">Product Name:</p>
                <p className="font-semibold text-gray-900">{stockItem.name || 'Unknown'}</p>
                <p className="text-sm text-gray-600 mt-2">Brand:</p>
                <p className="font-semibold text-gray-900">{stockItem.brand || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-2">Model:</p>
                <p className="font-semibold text-gray-900">{stockItem.model || 'N/A'}</p>
              </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Deleting...' : 'Delete Stock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
