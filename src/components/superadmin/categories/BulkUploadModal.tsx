 
import { useState, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useProductCategory } from '../../../hooks/useProductCategory';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const categoryHook = useProductCategory();
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
      const response = await categoryHook.bulkUploadCategories(selectedFile);
      if (response?.success) {
        const data = response.data;
        toast.success(
          `Bulk upload completed! Created: ${data?.created || 0}, Updated: ${data?.updated || 0}, Skipped: ${data?.skipped || 0}`
        );
        onSuccess();
        handleClose();
      } else {
        toast.error(response?.message || 'Bulk upload failed');
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error('Failed to upload categories');
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
    link.href = '/samples/sample_categories.xlsx';
    link.download = 'sample_categories.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Upload Categories</DialogTitle>
        </DialogHeader>
        <div className="px-1 py-2">

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Upload an Excel (.xlsx) or CSV file containing category data.
                The file should have the following columns:
              </p>
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-xs text-gray-700 font-mono">
                  name, description, parentName, isActive, displayOrder
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" className="bg-orange-600 hover:bg-orange-700 text-white" onClick={handleSubmit} disabled={!selectedFile || loading}>
              {loading ? 'Uploading...' : 'Upload Categories'}
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
          </div>
      </DialogContent>
    </Dialog>
  );
}