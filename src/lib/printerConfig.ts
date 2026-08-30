/**
 * Printer configuration helpers (per location, stored in localStorage)
 *
 * Each branch/location stores its own PrinterConfig so multiple tenants
 * can have different printers on the same SaaS without a DB schema change.
 */

/** Mobile print path when QZ Tray is unavailable (iPad / phone). */
export type MobilePrintMode = "auto" | "webprnt" | "passprnt" | "browser";

export interface PrinterConfig {
  /** Windows/OS printer name as returned by QZ Tray */
  printerName: string;
  /** Thermal paper width */
  paperWidth: "58mm" | "80mm";
  /** Open cash drawer automatically on every sale completion */
  autoOpenDrawer: boolean;
  /** Trigger ESC/POS print automatically after a successful sale */
  autoPrintOnSale: boolean;
  /**
   * iPad/phone print strategy. Desktop QZ path is unaffected.
   * auto = WebPRNT if host set, else PassPRNT on mobile, else browser.
   */
  mobilePrintMode?: MobilePrintMode;
  /** Star WebPRNT printer IP or hostname (LAN/WiFi models). */
  starWebPrntHost?: string;
  /** Star WebPRNT port (default 8001). */
  starWebPrntPort?: number;
  /** Use HTTPS for WebPRNT (required when SaaS app is served over HTTPS). */
  starWebPrntSecure?: boolean;
}

const STORAGE_KEY_PREFIX = "printer_config_";

function storageKey(locationId: string): string {
  return `${STORAGE_KEY_PREFIX}${locationId}`;
}

/**
 * Return the stored PrinterConfig for the given location, or null if not set.
 */
export function getPrinterConfig(locationId: string): PrinterConfig | null {
  try {
    const raw = localStorage.getItem(storageKey(locationId));
    if (!raw) return null;
    return JSON.parse(raw) as PrinterConfig;
  } catch {
    return null;
  }
}

/**
 * Persist a PrinterConfig for the given location.
 */
export function setPrinterConfig(
  locationId: string,
  config: PrinterConfig,
): void {
  localStorage.setItem(storageKey(locationId), JSON.stringify(config));
}

/**
 * Remove the stored PrinterConfig for the given location.
 */
export function clearPrinterConfig(locationId: string): void {
  localStorage.removeItem(storageKey(locationId));
}

export const DEFAULT_PRINTER_CONFIG: PrinterConfig = {
  printerName: "",
  paperWidth: "58mm",
  autoOpenDrawer: true,
  autoPrintOnSale: false,
  mobilePrintMode: "auto",
  starWebPrntHost: "",
  starWebPrntPort: 8001,
  starWebPrntSecure: false,
};

/** Resolve thermal width from device settings (mPOP is usually 58mm). */
export function resolveThermalPaperFormat(
  printerConf?: PrinterConfig | null,
  orgDefaultFormat?: string | null,
): "58mm" | "80mm" {
  if (printerConf?.paperWidth === "58mm" || printerConf?.paperWidth === "80mm") {
    return printerConf.paperWidth;
  }
  if (orgDefaultFormat === "58mm" || orgDefaultFormat === "80mm") {
    return orgDefaultFormat;
  }
  return "58mm";
}
