 
import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useProduct } from '../../../hooks/useProduct';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const productHook = useProduct();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    const allowedExtensions = ['.xlsx', '.csv'];

    const isValidType = allowedTypes.includes(file.type) ||
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      toast.error('Please select a valid Excel (.xlsx) or CSV (.csv) file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setLoading(true);
    try {
      const response = await productHook.bulkUploadProducts(selectedFile);
      if (response?.success) {
        const data = response.data as { created?: number; updated?: number; errors?: number };
        const created = data?.created || 0;
        const updated = data?.updated || 0;
        const errors = data?.errors || 0;

        if (errors > 0) {
          toast.success(
            `Bulk upload completed with warnings. Created: ${created}, Updated: ${updated}, Errors: ${errors}`
          );
        } else {
          toast.success(
            `Bulk upload completed! Created: ${created}, Updated: ${updated}`
          );
        }
        onSuccess();
        handleClose();
      } else {
        toast.error(response?.message || 'Bulk upload failed');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to upload products');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setDragActive(false);
    onClose();
  };

  const handleDownloadSample = () => {
    const link = document.createElement('a');
    link.href = '/samples/phone_shop_products.xlsx';
    link.download = 'sample_products.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay overflow-y-auto" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="flex items-center justify-center min-h-full px-4 py-8">
        <div
          className="glass-modal-panel w-full max-w-lg text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Bulk Upload Products
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload an Excel (.xlsx) or CSV file containing product data.
                The file should have the following columns:
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-700 font-mono">
                  sku, barcode, name, description, categoryName, parentCategoryName, brand, model, unitPrice, costPrice, wholesalePrice, minStockLevel, maxStockLevel, reorderLevel, reorderQuantity, warrantyMonths, isActive
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  unitPrice is required for new products. If a matching existing product is found or a previous row with same SKU/barcode has a price, blank unitPrice can be auto-filled.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  For duplicate category names, either fill parentCategoryName, or use category path in categoryName (example: Frames &gt; Flymount Frame).
                </p>
              </div>
            </div>

            {/* File Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-orange-400 bg-orange-50'
                  : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3">
                  <FileText className="w-8 h-8 text-green-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    Drag and drop your file here, or{' '}
                    <label className="text-orange-600 hover:text-orange-700 cursor-pointer underline">
                      browse
                      <input
                        type="file"
                        accept=".xlsx,.csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports Excel (.xlsx) and CSV files up to 10MB
                  </p>
                </div>
              )}
            </div>

            {/* Sample File Download */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-amber-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Need a sample file?</span>
              </div>
              <button
                onClick={handleDownloadSample}
                className="text-sm text-orange-600 hover:text-orange-700 underline"
              >
                Download Sample Excel
              </button>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload Products'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}