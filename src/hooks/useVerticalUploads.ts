import { useCallback, useState } from 'react';
import { getAccessToken } from '../utils/tokenStorage';

const BASE_URL = import.meta.env.VITE_BASE_URL || 'https://gadget-chain-manager-backend.vercel.app/api';

export type UploadFolder =
  | 'condition-reports'
  | 'trade-ins'
  | 'inspections'
  | 'verticals'
  | 'rental-vehicles'
  | 'renter-identity'
  | 'driver-licenses';

/**
 * Upload photos for the vertical modules (condition reports, trade-ins, inspections).
 * Backend compresses to WebP and stores on ImageKit; returns CDN URLs.
 */
export const useVerticalUploads = () => {
  const [uploading, setUploading] = useState(false);

  const uploadPhotos = useCallback(async (files: File[], folder: UploadFolder = 'verticals'): Promise<string[]> => {
    if (!files.length) return [];
    setUploading(true);
    try {
      const token = getAccessToken();
      const form = new FormData();
      files.forEach((f) => form.append('images', f));
      const res = await fetch(`${BASE_URL}/vertical-uploads?folder=${folder}`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: form,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message ?? 'Photo upload failed');
      }
      const json = await res.json();
      return ((json.data?.photos ?? []) as { url: string }[]).map((p) => p.url);
    } finally {
      setUploading(false);
    }
  }, []);

  return { uploadPhotos, uploading };
};

export default useVerticalUploads;
