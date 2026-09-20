import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LIVENESS_PROMPT_LABELS } from '@/utils/deviceFingerprint';

interface FaceCaptureModalProps {
  open: boolean;
  onClose: () => void;
  livenessPrompt: string;
  onCapture: (blobs: Blob[]) => Promise<void>;
  title?: string;
  frameCount?: number;
}

export function FaceCaptureModal({
  open,
  onClose,
  livenessPrompt,
  onCapture,
  title = 'Face verification',
  frameCount = 2,
}: FaceCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [step, setStep] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setStep(0);
      setError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError('Camera not supported in this browser. Use PIN fallback.');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(
          e instanceof Error && e.name === 'NotAllowedError'
            ? 'Camera permission denied. Allow camera access or use PIN fallback.'
            : 'Could not open camera.',
        );
      }
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [open, stopCamera]);

  const captureFrame = async (): Promise<Blob> => {
    const video = videoRef.current;
    if (!video) throw new Error('Camera not ready');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas error');
    ctx.drawImage(video, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Capture failed'));
      }, 'image/jpeg', 0.85);
    });
  };

  const handleCapture = async () => {
    setCapturing(true);
    setError(null);
    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < frameCount; i++) {
        if (i > 0) {
          setStep(i);
          await new Promise((r) => setTimeout(r, 900));
        }
        blobs.push(await captureFrame());
      }
      await onCapture(blobs);
      stopCamera();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Capture failed');
    } finally {
      setCapturing(false);
    }
  };

  const promptLabel = LIVENESS_PROMPT_LABELS[livenessPrompt] ?? 'Center your face in the frame';

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{promptLabel}</p>
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover mirror" playsInline muted />
              {step === 0 && (
                <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-full pointer-events-none" />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { stopCamera(); onClose(); }}>Cancel</Button>
          <Button onClick={handleCapture} disabled={capturing || !!error}>
            {capturing ? 'Verifying…' : step === 0 ? 'Start capture' : 'Finish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
