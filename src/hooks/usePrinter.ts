/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * usePrinter – React hook for QZ Tray WebSocket connection and ESC/POS printing.
 *
 * QZ Tray must be running locally (ws://localhost:8181).
 * If QZ Tray is not installed the hook surfaces a helpful error message with a
 * download link rather than crashing.
 *
 * Install the npm package in the frontend project:
 *   npm install qz-tray
 */

import { useState, useCallback, useRef } from 'react';

// QZ Tray is loaded via dynamic import so Vite's ESM bundler doesn't fail
// at compile time. The resolved module is cached after the first successful load.
let qz: any = null;

async function loadQZ(): Promise<any> {
  if (qz) return qz;
  try {
    const mod = await import('qz-tray');
    // The package may export itself as default or as the module object directly
    qz = (mod as any).default ?? mod;
    return qz;
  } catch {
    return null;
  }
}

const QZ_DOWNLOAD_URL = 'https://qz.io/download/';

const BACKEND_URL =
  (import.meta as any).env?.VITE_BASE_URL ||
  'https://gadgetchain-manager-backend-production.up.railway.app/api';

/**
 * Configures QZ Tray to use the backend-issued certificate so the browser
 * shows "Trusted" instead of "Untrusted website".
 * Must be called every time before qz.websocket.connect().
 */
function setupQZSecurity(): void {
  qz.security.setCertificatePromise((resolve: (cert: string) => void) => {
    fetch(`${BACKEND_URL}/qz/certificate`)
      .then(res => res.text())
      .then(resolve)
      .catch(() => resolve(''));
  });

  qz.security.setSignatureAlgorithm('SHA512');

  qz.security.setSignaturePromise((toSign: string) => {
    return (resolve: (sig: string) => void, reject: (err: any) => void) => {
      fetch(`${BACKEND_URL}/qz/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toSign }),
      })
        .then(res => res.text())
        .then(resolve)
        .catch(reject);
    };
  });
}

// ESC/POS cash drawer kick bytes (works with most thermal printers)
const DRAWER_KICK_BYTES = [0x1b, 0x70, 0x00, 0x19, 0xfa];

interface UsePrinterReturn {
  /** Whether QZ Tray WebSocket is currently connected */
  isConnected: boolean;
  /** Latest error message, null when no error */
  error: string | null;
  /** Connect to QZ Tray (ws://localhost:8181) */
  connect: () => Promise<void>;
  /** Disconnect from QZ Tray */
  disconnect: () => Promise<void>;
  /** List available printer names via QZ Tray */
  getAvailablePrinters: () => Promise<string[]>;
  /**
   * Send raw ESC/POS byte commands to a named printer.
   * @param commands  Flat array of byte values (0–255)
   * @param printerName  Exact printer name returned by getAvailablePrinters()
   */
  printESCPOS: (commands: number[], printerName: string) => Promise<void>;
  /**
   * Send only the cash-drawer kick pulse to a named printer.
   * @param printerName  Exact printer name returned by getAvailablePrinters()
   */
  openDrawerOnly: (printerName: string) => Promise<void>;
  /**
   * Auto-connect QZ Tray (if not already connected) then send ESC/POS commands.
   * Returns true if QZ was available and the print job was sent, false otherwise.
   * Never throws – failures are swallowed so the caller can fall back gracefully.
   */
  tryPrintESCPOS: (commands: number[], printerName: string) => Promise<boolean>;
  /**
   * Auto-connect QZ Tray (if not already connected) then send the cash-drawer kick.
   * Returns true if QZ was available and the kick was sent, false otherwise.
   * Never throws.
   */
  tryOpenDrawer: (printerName: string) => Promise<boolean>;
}

export function usePrinter(): UsePrinterReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether we are already in the middle of a connect() call so that
  // parallel callers do not race.
  const connectingRef = useRef(false);

  // ── Private helper ─────────────────────────────────────────────────────────

  async function ensureQZ(): Promise<boolean> {
    if (!qz) await loadQZ();
    return qz !== null;
  }

  // ── connect ────────────────────────────────────────────────────────────────

  const connect = useCallback(async (): Promise<void> => {
    const loaded = await ensureQZ();
    if (!loaded) {
      setError(
        `QZ Tray npm package is not installed. Run: npm install qz-tray\n` +
          `Also make sure QZ Tray desktop app is running: ${QZ_DOWNLOAD_URL}`,
      );
      return;
    }

    if (connectingRef.current) return;
    if (qz.websocket.isActive()) {
      setIsConnected(true);
      setError(null);
      return;
    }

    connectingRef.current = true;
    setError(null);

    try {
      setupQZSecurity();
      await qz.websocket.connect();
      setIsConnected(true);
    } catch (err: any) {
      const msg: string =
        String(err?.message || err || 'Unknown error').includes('Unable to establish')
          ? `QZ Tray is not running. Download it from ${QZ_DOWNLOAD_URL} and start it, then try again.`
          : `Could not connect to QZ Tray: ${err?.message ?? String(err)}`;
      setError(msg);
      setIsConnected(false);
    } finally {
      connectingRef.current = false;
    }
  }, []);

  // ── disconnect ─────────────────────────────────────────────────────────────

  const disconnect = useCallback(async (): Promise<void> => {
    if (!qz) return;
    try {
      if (qz.websocket.isActive()) {
        await qz.websocket.disconnect();
      }
    } catch {
      // Ignore disconnect errors
    } finally {
      setIsConnected(false);
    }
  }, []);

  // ── getAvailablePrinters ───────────────────────────────────────────────────

  const getAvailablePrinters = useCallback(async (): Promise<string[]> => {
    if (!qz) throw new Error('QZ Tray is not loaded. Click Connect first.');
    if (!qz.websocket.isActive()) {
      throw new Error('QZ Tray is not connected. Call connect() first.');
    }

    try {
      const printers: string | string[] = await qz.printers.find();
      // qz.printers.find() may return a string or an array
      if (Array.isArray(printers)) return printers;
      if (typeof printers === 'string') return [printers];
      return [];
    } catch (err: any) {
      throw new Error(`Failed to list printers: ${err?.message ?? String(err)}`);
    }
  }, []);

  // ── printESCPOS ────────────────────────────────────────────────────────────

  const printESCPOS = useCallback(
    async (commands: number[], printerName: string): Promise<void> => {
      if (!qz) throw new Error('QZ Tray is not loaded. Click Connect first.');
      if (!printerName) throw new Error('No printer name provided.');
      if (!qz.websocket.isActive()) {
        throw new Error('QZ Tray is not connected. Call connect() first.');
      }

      // Convert flat byte array to Base64 so QZ Tray can send it as raw bytes
      const uint8 = new Uint8Array(commands);
      const binary = Array.from(uint8)
        .map(b => String.fromCharCode(b))
        .join('');
      const base64 = btoa(binary);

      const config = qz.configs.create(printerName);
      const data = [{ type: 'raw', format: 'base64', data: base64 }];

      await qz.print(config, data);
    },
    [],
  );

  // ── openDrawerOnly ─────────────────────────────────────────────────────────

  const openDrawerOnly = useCallback(
    async (printerName: string): Promise<void> => {
      await printESCPOS(DRAWER_KICK_BYTES, printerName);
    },
    [printESCPOS],
  );

  // ── tryPrintESCPOS ─────────────────────────────────────────────────────────
  // Silently auto-connects QZ Tray if needed, then prints. Returns false if QZ
  // is unavailable so the caller can fall back to browser printing.

  const tryPrintESCPOS = useCallback(
    async (commands: number[], printerName: string): Promise<boolean> => {
      try {
        if (!qz) await loadQZ();
        if (!qz) return false;
        if (!qz.websocket.isActive()) {
          setupQZSecurity();
          await qz.websocket.connect();
          setIsConnected(true);
        }
        await printESCPOS(commands, printerName);
        return true;
      } catch {
        return false;
      }
    },
    [printESCPOS],
  );

  // ── tryOpenDrawer ──────────────────────────────────────────────────────────
  // Like tryPrintESCPOS but only sends the drawer-kick pulse. Returns false if
  // QZ Tray is not available.

  const tryOpenDrawer = useCallback(
    async (printerName: string): Promise<boolean> => {
      return tryPrintESCPOS(DRAWER_KICK_BYTES, printerName);
    },
    [tryPrintESCPOS],
  );

  return {
    isConnected,
    error,
    connect,
    disconnect,
    getAvailablePrinters,
    printESCPOS,
    openDrawerOnly,
    tryPrintESCPOS,
    tryOpenDrawer,
  };
}

export default usePrinter;
