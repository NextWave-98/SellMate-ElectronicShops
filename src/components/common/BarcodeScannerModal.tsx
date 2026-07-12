/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * BarcodeScannerModal
 *
 * Supports two scan modes:
 *  1. USB / Bluetooth HID barcode scanners  – they emulate keyboard input,
 *     typing the barcode fast and pressing Enter.  Works in ANY browser.
 *  2. Camera scanner  – uses the native browser BarcodeDetector API when
 *     available, otherwise falls back to html5-qrcode (works on iOS Safari).
 *
 * Usage:
 *   <BarcodeScannerModal
 *     open={showScanner}
 *     onClose={() => setShowScanner(false)}
 *     onScan={(value) => handleScan(value)}
 *   />
 */
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Camera, Keyboard, Scan, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  /** Called with the raw scanned value (barcode / SKU / product-code string) */
  onScan: (value: string) => void;
  /** Friendly label for what is being scanned */
  title?: string;
  /** Open directly in camera mode (useful on mobile) */
  defaultMode?: 'keyboard' | 'camera';
}

type ScanMode = 'keyboard' | 'camera';

const HTML5_SCANNER_ID = 'barcode-scanner-camera-region';

// ─── HID detection helpers ────────────────────────────────────────────────────

const HID_THRESHOLD_MS = 50;   // characters typed faster than this → scanner
const HID_MIN_LENGTH  = 4;     // minimum barcode length to accept

const hasNativeBarcodeDetector = () => 'BarcodeDetector' in window;

const hasCameraSupport = () =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices?.getUserMedia;

// ─── Component ────────────────────────────────────────────────────────────────

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  open,
  onClose,
  onScan,
  title = 'Scan Barcode',
  defaultMode = 'keyboard',
}) => {
  const [mode, setMode] = useState<ScanMode>(defaultMode);
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraSupported] = useState(hasCameraSupport);
  const [useNativeDetector] = useState(hasNativeBarcodeDetector);

  // HID scanner state
  const hidBuffer = useRef('');
  const hidLastTime = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScanAtRef = useRef(0);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, defaultMode]);

  // ── Focus input when keyboard mode is active ──────────────────────────────
  useEffect(() => {
    if (open && mode === 'keyboard') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  const fireHIDScan = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLastScanned(trimmed);
    onScan(trimmed);
  }, [onScan]);

  const handleCameraScan = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (now - lastScanAtRef.current < 1500) return;
    lastScanAtRef.current = now;
    setLastScanned(trimmed);
    onScan(trimmed);
  }, [onScan]);

  // ── Global keyboard listener for HID scanners ─────────────────────────────
  useEffect(() => {
    if (!open || mode !== 'keyboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is inside the manual text input (let the input handle it)
      if (document.activeElement === inputRef.current) return;

      const now = Date.now();
      if (e.key === 'Enter') {
        if (hidBuffer.current.length >= HID_MIN_LENGTH) {
          fireHIDScan(hidBuffer.current);
        }
        hidBuffer.current = '';
      } else if (e.key.length === 1) {
        // Only accept characters that appeared quickly after previous (HID scanners are fast)
        if (now - hidLastTime.current > HID_THRESHOLD_MS * 10) hidBuffer.current = '';
        hidBuffer.current += e.key;
        hidLastTime.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, mode, fireHIDScan]);

  // ── Camera detection loop (native BarcodeDetector) ─────────────────────────
  const detectLoop = useCallback(() => {
    const detect = async () => {
      if (!detectorRef.current || !videoRef.current) return;
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            handleCameraScan(barcodes[0].rawValue as string);
          }
        } catch { /* detection error – continue */ }
      }
      rafRef.current = requestAnimationFrame(detect);
    };
    rafRef.current = requestAnimationFrame(detect);
  }, [handleCameraScan]);

  const stopHtml5Qrcode = useCallback(async () => {
    if (!html5QrcodeRef.current) return;
    try {
      const state = html5QrcodeRef.current.getState();
      if (state === 2) {
        await html5QrcodeRef.current.stop();
      }
      html5QrcodeRef.current.clear();
    } catch {
      // ignore cleanup errors
    }
    html5QrcodeRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    void stopHtml5Qrcode();
  }, [stopHtml5Qrcode]);

  const startHtml5Qrcode = useCallback(async () => {
    const scanner = new Html5Qrcode(HTML5_SCANNER_ID);
    html5QrcodeRef.current = scanner;
    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.777,
      },
      (decodedText) => {
        handleCameraScan(decodedText);
      },
      () => {},
    );
  }, [handleCameraScan]);

  // ── Camera: start / stop ──────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (useNativeDetector) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const BarcodeDetector = (window as any).BarcodeDetector;
        detectorRef.current = new BarcodeDetector({
          formats: [
            'code_128','code_39','code_93','codabar',
            'ean_13','ean_8','upc_a','upc_e',
            'qr_code','data_matrix','pdf417','aztec',
          ],
        });

        detectLoop();
      } else {
        await startHtml5Qrcode();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Please allow camera permissions in your browser settings.');
      } else {
        setCameraError(`Could not start camera: ${err.message}`);
      }
    }
  }, [detectLoop, startHtml5Qrcode, useNativeDetector]);

  // Start / stop camera when mode changes
  useEffect(() => {
    if (!open) return;
    if (mode === 'camera' && cameraSupported) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [open, mode, cameraSupported, startCamera, stopCamera]);

  // Cleanup on unmount / close
  useEffect(() => {
    if (!open) stopCamera();
  }, [open, stopCamera]);

  // ── Manual input submit ────────────────────────────────────────────────────
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = manualInput.trim();
    if (val.length >= 2) {
      setLastScanned(val);
      onScan(val);
      setManualInput('');
    }
  };


  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-linear-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2 text-white">
            <Scan className="h-5 w-5" />
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setMode('keyboard')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'keyboard'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Keyboard className="h-4 w-4" />
            Scanner / Manual
          </button>
          <button
            onClick={() => setMode('camera')}
            disabled={!cameraSupported}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'camera'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <Camera className="h-4 w-4" />
            Camera
            {!cameraSupported && <span className="text-xs text-gray-400">(unsupported)</span>}
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* ── Keyboard / HID mode ── */}
          {mode === 'keyboard' && (
            <div className="space-y-4">
              {/* HID scanner hint */}
              <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-3">
                <div className="mt-0.5 shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Keyboard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-800">USB / Bluetooth Scanner Ready</p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Point your scanner at any barcode. The scan will be detected automatically.
                  </p>
                </div>
              </div>

              {/* Manual input fallback */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium uppercase tracking-wide">
                  Or type manually
                </p>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Barcode / SKU / Product code…"
                    autoComplete="off"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Button
                    type="submit"
                    disabled={manualInput.trim().length < 2}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Search
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* ── Camera mode ── */}
          {mode === 'camera' && (
            <div className="space-y-3">
              {cameraError ? (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 p-3">
                  <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{cameraError}</p>
                </div>
              ) : useNativeDetector ? (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    autoPlay
                  />
                  {/* Scan guide overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-56 h-32 border-2 border-white/70 rounded-lg relative">
                      <span className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl-sm" />
                      <span className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr-sm" />
                      <span className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl-sm" />
                      <span className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br-sm" />
                      <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-blue-400/70 animate-pulse" />
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  id={HTML5_SCANNER_ID}
                  className="rounded-xl overflow-hidden bg-black min-h-[220px]"
                />
              )}
              <p className="text-xs text-gray-500 text-center">
                Align the barcode within the frame to scan automatically
              </p>
            </div>
          )}

          {/* ── Last scanned result ── */}
          {lastScanned && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-green-700 font-medium">Last scanned</p>
                <p className="text-sm font-mono text-green-900 truncate">{lastScanned}</p>
              </div>
              <Loader2 className="h-4 w-4 text-green-600 animate-spin ml-auto shrink-0" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScannerModal;
