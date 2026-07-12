/**
 * usePOSSettings
 *
 * Persists POS hardware/print defaults in the backend database (per location).
 * Falls back to / mirrors localStorage for instant synchronous reads.
 * Used by Quick POS, normal POS, and the POS Settings admin page.
 */
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { getAccessToken } from "../utils/tokenStorage";

export type PaperFormat = "a4" | "80mm" | "58mm";
export type BarcodeReaderType = "usb" | "bluetooth" | "camera" | "none";

export interface POSSettings {
  defaultPrinterId: string;
  defaultFormat: PaperFormat;
  barcodeReaderType: BarcodeReaderType;
  /** Automatically show cash-drawer overlay after every cash sale */
  autoCashDrawer: boolean;
  /** Organization-level: automatically print receipt after every sale */
  autoPrintOnSale: boolean;
  /** Organization-level: Quick POS can create system-only courier sales using branch details */
  courierStockAdjustmentOnly: boolean;
}

const DEFAULT_SETTINGS: POSSettings = {
  defaultPrinterId: "star-micronics-bluetooth",
  defaultFormat: "80mm",
  barcodeReaderType: "usb",
  autoCashDrawer: true,
  autoPrintOnSale: true,
  courierStockAdjustmentOnly: false,
};

const BASE_URL =
  import.meta.env.VITE_BASE_URL ||
  "https://gadget-chain-manager-backend.vercel.app/api";

function localKey(businessId?: string | null) {
  return `pos_settings_${businessId ?? "default"}`;
}

export function usePOSSettings() {
  const { user } = useAuth();
  const key = localKey(user?.businessId);
  const locationId = user?.locationId || user?.branchId;

  /** null = still loading from backend */
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);

  // ── Sync helpers ────────────────────────────────────────────────────────────

  const readLocal = useCallback((): POSSettings => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } as POSSettings;
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }, [key]);

  const writeLocal = useCallback(
    (partial: Partial<POSSettings>) => {
      const current = readLocal();
      localStorage.setItem(key, JSON.stringify({ ...current, ...partial }));
    },
    [key, readLocal],
  );

  // ── Fetch from backend ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!locationId) {
      // Org admin has no location – treat as configured so POS is not blocked
      setIsConfigured(true);
      return;
    }

    let cancelled = false;
    const token = getAccessToken();

    setLoadingSettings(true);
    fetch(`${BASE_URL}/locations/${locationId}/pos-settings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        const d = body?.data;
        if (d) {
          // Backend can provide org/default POS settings even before a branch has
          // explicitly saved its own settings. Treat those defaults as usable so
          // POS can print with the default Star/iPad profile instead of blocking.
          setIsConfigured(
            !!d.isConfigured || !!d.defaultPrinterId || !!d.defaultFormat,
          );
          // autoPrintOnSale, autoCashDrawer, defaultFormat come from org/branch level – always cache them
          const alwaysCache: Partial<POSSettings> = {
            autoPrintOnSale:
              d.autoPrintOnSale ?? DEFAULT_SETTINGS.autoPrintOnSale,
            autoCashDrawer: d.autoCashDrawer ?? DEFAULT_SETTINGS.autoCashDrawer,
            courierStockAdjustmentOnly:
              d.courierStockAdjustmentOnly ??
              DEFAULT_SETTINGS.courierStockAdjustmentOnly,
          };
          if (d.defaultFormat) {
            alwaysCache.defaultFormat = d.defaultFormat as PaperFormat;
          }
          writeLocal(alwaysCache);
          if (d.isConfigured) {
            // Mirror backend values into localStorage cache
            writeLocal({
              defaultPrinterId:
                d.defaultPrinterId ?? DEFAULT_SETTINGS.defaultPrinterId,
              ...(d.defaultFormat
                ? { defaultFormat: d.defaultFormat as PaperFormat }
                : {}),
              barcodeReaderType:
                (d.barcodeReaderType as BarcodeReaderType) ??
                DEFAULT_SETTINGS.barcodeReaderType,
            });
          }
        } else {
          setIsConfigured(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Network error – fall back to localStorage; don't block POS
          setIsConfigured(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSettings(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Synchronous read – returns localStorage cache (fast, used during render). */
  const getSettings = useCallback((): POSSettings => readLocal(), [readLocal]);

  /** Save to backend + localStorage. */
  const saveSettings = useCallback(
    async (partial: Partial<POSSettings>) => {
      writeLocal(partial);

      if (!locationId) return; // org admin – local only is fine

      const token = getAccessToken();
      const current = readLocal();
      const merged = { ...current, ...partial };

      const response = await fetch(
        `${BASE_URL}/locations/${locationId}/pos-settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            defaultPrinterId: merged.defaultPrinterId,
            defaultFormat: merged.defaultFormat,
            barcodeReaderType: merged.barcodeReaderType,
            autoCashDrawer: merged.autoCashDrawer,
            autoPrintOnSale: merged.autoPrintOnSale,
            courierStockAdjustmentOnly: merged.courierStockAdjustmentOnly,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.message || "Failed to save POS settings");
      }

      setIsConfigured(true);
    },
    [locationId, readLocal, writeLocal],
  );

  /** Reset to defaults – clears backend + localStorage. */
  const resetSettings = useCallback(async () => {
    localStorage.removeItem(key);

    if (!locationId) return;

    const token = getAccessToken();
    await fetch(`${BASE_URL}/locations/${locationId}/pos-settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        defaultPrinterId: DEFAULT_SETTINGS.defaultPrinterId,
        defaultFormat: DEFAULT_SETTINGS.defaultFormat,
        barcodeReaderType: DEFAULT_SETTINGS.barcodeReaderType,
        autoCashDrawer: DEFAULT_SETTINGS.autoCashDrawer,
        courierStockAdjustmentOnly:
          DEFAULT_SETTINGS.courierStockAdjustmentOnly,
      }),
    }).catch(() => {
      /* ignore network errors on reset */
    });

    setIsConfigured(true);
  }, [key, locationId]);

  return {
    getSettings,
    saveSettings,
    resetSettings,
    isConfigured,
    loadingSettings,
  };
}
