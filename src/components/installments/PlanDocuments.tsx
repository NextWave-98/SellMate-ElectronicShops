import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';
import useFetch from '../../hooks/useFetch';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MAX_DOCUMENT_IMAGES, prepareDocumentImages, formatKB } from '../../utils/documentImages';

export interface PlanDocument {
    id: string;
    url: string;
    name: string;
    format: string;
    size: number;
    originalSize?: number;
    width?: number;
    height?: number;
    uploadedAt: string;
}

interface Props {
    planId: string;
    documents: PlanDocument[];
    editable: boolean;
    onChange: (docs: PlanDocument[]) => void;
}

/**
 * Up to 5 document images per installment plan (NIC, agreement, bills…).
 * Images are shrunk in the browser first; the server stores them as
 * WebP/AVIF at no more than 500 KB each.
 */
export default function PlanDocuments({ planId, documents, editable, onChange }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { fetchData: upload } = useFetch<PlanDocument[]>(`/installments/plans/${planId}/documents`);
    const { fetchData: remove } = useFetch<PlanDocument[]>('');

    const room = MAX_DOCUMENT_IMAGES - documents.length;

    const handleFiles = async (list: FileList | null) => {
        if (!list || list.length === 0) return;
        const { files, errors } = await prepareDocumentImages(Array.from(list), documents.length);
        errors.forEach((e) => toast.error(e));
        if (files.length === 0) return;

        const form = new FormData();
        files.forEach((f) => form.append('documents', f));
        setUploading(true);
        try {
            const res = await upload({
                method: 'POST',
                data: form,
                contentType: 'multipart/form-data',
                silent: true,
            });
            if (res?.success && Array.isArray(res.data)) {
                onChange(res.data);
                toast.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded`);
            }
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const handleDelete = async (doc: PlanDocument) => {
        if (!window.confirm(`Remove "${doc.name}"?`)) return;
        setDeletingId(doc.id);
        try {
            const res = await remove({
                endpoint: `/installments/plans/${planId}/documents/${doc.id}`,
                method: 'DELETE',
                silent: true,
            });
            if (res?.success && Array.isArray(res.data)) {
                onChange(res.data);
                toast.success('Document removed');
            }
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Documents</h2>
                    <p className="text-sm text-gray-500">
                        {documents.length} / {MAX_DOCUMENT_IMAGES} images · max 5 MB each, saved compressed (WebP/AVIF)
                    </p>
                </div>
                {editable && room > 0 && (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFiles(e.target.files)}
                        />
                        <Button onClick={() => inputRef.current?.click()} disabled={uploading} variant="outline">
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                            {uploading ? 'Uploading…' : 'Add images'}
                        </Button>
                    </>
                )}
            </div>

            {documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
                    <FileImage className="w-8 h-8 mb-2" />
                    <p className="text-sm">No documents attached</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {documents.map((doc) => (
                        <div key={doc.id} className="group relative rounded-lg overflow-hidden border border-gray-200 bg-white">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Open full size">
                                <img src={doc.url} alt={doc.name} loading="lazy" className="w-full h-32 object-cover" />
                            </a>
                            <div className="px-2 py-1.5 text-xs text-gray-600">
                                <p className="truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-gray-400">
                                    {doc.format?.toUpperCase()} · {formatKB(doc.size)}
                                    {doc.originalSize ? ` (was ${formatKB(doc.originalSize)})` : ''}
                                </p>
                            </div>
                            {editable && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(doc)}
                                    disabled={deletingId === doc.id}
                                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-white/90 text-red-600 shadow opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                                    title="Remove"
                                >
                                    {deletingId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
