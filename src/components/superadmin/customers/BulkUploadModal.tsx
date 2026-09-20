import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import useCustomer from '../../../hooks/useCustomer';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const { bulkUploadCustomers } = useCustomer();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);

  const handleFileSelect = useCallback((file: File) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const isValidType = allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      toast.error('Please select a valid Excel (.xlsx) or CSV (.csv) file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setErrorDetails([]);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFileSelect(file);
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const files = e.dataTransfer.files;
      if (files?.[0]) handleFileSelect(files[0]);
    },
    [handleFileSelect]
  );

  const handleClose = () => {
    setSelectedFile(null);
    setDragActive(false);
    setErrorDetails([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setLoading(true);
    setErrorDetails([]);
    try {
      const response = await bulkUploadCustomers(selectedFile);
      if (response?.success) {
        const data = response.data as {
          created?: number;
          updated?: number;
          errors?: number;
          errorDetails?: string[];
        };
        const created = data?.created || 0;
        const updated = data?.updated || 0;
        const errors = data?.errors || 0;
        const details = data?.errorDetails || [];

        if (errors > 0) {
          toast.success(
            `Upload finished. Created: ${created}, Updated: ${updated}, Errors: ${errors}`
          );
          if (details.length > 0) {
            console.warn('Customer bulk upload row errors:', details);
          }
        } else {
          toast.success(`Customers uploaded. Created: ${created}, Updated: ${updated}`);
        }
        onSuccess();
        handleClose();
      } else {
        toast.error(response?.message || 'Bulk upload failed');
      }
    } catch (error) {
      console.error('Customer bulk upload error:', error);
      toast.error('Failed to upload customers');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadSample = () => {
    const csv = [
      'name,address,phone num1,phone num2',
      'Sample Customer,123 Main Street Colombo,0771234567,0719876543',
      'Another Customer,45 Galle Road Dehiwala,0753708974,',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample_customers.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div
      className="glass-modal-overlay overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="flex items-center justify-center min-h-full px-4 py-8">
        <div
          className="glass-modal-panel w-full max-w-lg text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Bulk Upload Customers
              </h3>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload an Excel (.xlsx) or CSV file with customer data. If the phone
                number already exists, that customer is <strong>updated</strong> (including
                alternate phone, name, and address).
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-700 font-mono">
                  name, address, phone num1, phone num2
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Optional columns: email, city, nic, notes, customerType (WALK_IN / REGULAR / VIP)
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Phone aliases accepted: phone, phone num1, mobile. Alternate: phone num2, alternatePhone.
                </p>
              </div>
            </div>

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
                        accept=".xlsx,.xls,.csv"
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

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center text-amber-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Need a sample file?</span>
              </div>
              <button
                onClick={handleDownloadSample}
                className="text-sm text-orange-600 hover:text-orange-700 underline inline-flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Sample CSV
              </button>
            </div>

            {errorDetails.length > 0 && (
              <div className="mt-4 max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-medium text-amber-800 mb-1">
                  Row errors (showing first {errorDetails.length}):
                </p>
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {errorDetails.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedFile || loading}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-400 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Uploading...' : 'Upload Customers'}
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
