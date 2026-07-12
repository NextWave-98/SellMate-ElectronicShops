import { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { useVerticalUploads, type UploadFolder } from '../../hooks/useVerticalUploads';

interface PhotoUploadInputProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  folder?: UploadFolder;
  max?: number;
  label?: string;
}

/**
 * Photo picker for vertical modules: uploads to /vertical-uploads (ImageKit CDN)
 * and reports back the URL list. Shows removable thumbnails.
 */
export default function PhotoUploadInput({
  photos,
  onChange,
  folder = 'verticals',
  max = 8,
  label = 'Photos',
}: PhotoUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadPhotos, uploading } = useVerticalUploads();

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList).slice(0, max - photos.length);
    if (!files.length) {
      toast.error(`Maximum ${max} photos`);
      return;
    }
    try {
      const urls = await uploadPhotos(files, folder);
      onChange([...photos, ...urls]);
      toast.success(`${urls.length} photo(s) uploaded`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploading || photos.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          <Camera className="w-4 h-4 mr-1" />
          {uploading ? 'Uploading...' : 'Add Photos'}
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {photos.map((url, idx) => (
            <div key={url + idx} className="relative w-16 h-16 rounded-md overflow-hidden border">
              <img src={url} alt={`photo-${idx}`} className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-0 right-0 bg-black/60 text-white rounded-bl-md p-0.5"
                onClick={() => onChange(photos.filter((_, i) => i !== idx))}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
