/**
 * Printer configuration helpers (per location, stored in localStorage)
 *
 * Each branch/location stores its own PrinterConfig so multiple tenants
 * can have different printers on the same SaaS without a DB schema change.
 */

/** Mobile print path when QZ Tray is unavailable (iPad / phone). */
export type MobilePrintMode = "auto" | "webprnt" | "passprnt" | "browser";

/**
 * How the physical cash drawer is wired.
 *  - "printer" : RJ11/RJ12 cable into the receipt printer's DK/CD port (the
 *                usual setup). The drawer opens when an ESC/POS kick pulse is
 *                sent to the printer.
 *  - "pc"      : drawer connects straight to the PC as a serial/virtual-COM
 *                device. The kick pulse is written to that COM port instead.
 *  - "off"     : never kick the drawer from software.
 */
export type DrawerConnection = "printer" | "pc" | "off";

/** Which DK pin the drawer solenoid is wired to. Pin 2 covers most drawers. */
export type DrawerKickPin = 2 | 5 | "both";

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
  /**
   * How the cash drawer is wired. Defaults to "printer" when absent so every
   * existing saved config keeps behaving the way it always has.
   */
  drawerConnection?: DrawerConnection;
  /** COM/serial port name when drawerConnection === "pc" (e.g. "COM3"). */
  drawerSerialPort?: string;
  /** Baud rate for a PC-connected drawer. Defaults to 9600. */
  drawerBaudRate?: number;
  /** DK pin the drawer is wired to. Defaults to 2. */
  drawerKickPin?: DrawerKickPin;
  /**
   * Opt in to raw ESC/POS printing through QZ Tray instead of the browser
   * print path. This is what removes the Chrome print window entirely. Off by
   * default: the receipt layout differs from the HTML one, so a shop has to
   * turn it on deliberately after checking a test receipt.
   */
  useRawEscposPrint?: boolean;
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
  drawerConnection: "printer",
  drawerSerialPort: "",
  drawerBaudRate: 9600,
  drawerKickPin: 2,
  useRawEscposPrint: false,
};

/** Defaults when no per-location config is saved yet. */
export function createDefaultPrinterConfig(options?: {
  preferWidePaper?: boolean;
}): PrinterConfig {
  return {
    ...DEFAULT_PRINTER_CONFIG,
    paperWidth: options?.preferWidePaper ? "80mm" : DEFAULT_PRINTER_CONFIG.paperWidth,
  };
}

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


/**
 * Resolve how the drawer is wired for a config that may predate the setting.
 * An absent value means "printer"  that is what every config saved before the
 * drawer options existed was implicitly doing.
 */
export function resolveDrawerConnection(
  printerConf?: PrinterConfig | null,
): DrawerConnection {
  const mode = printerConf?.drawerConnection;
  if (mode === "printer" || mode === "pc" || mode === "off") return mode;
  return "printer";
}

/**
 * Last-resort lookup for the pages that trigger a drawer kick without knowing
 * which location they are on (e.g. the post-sale overlay inside BillModal).
 * A POS terminal normally holds exactly one saved printer config.
 */
export function getAnyPrinterConfig(): PrinterConfig | null {
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(STORAGE_KEY_PREFIX)) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as PrinterConfig;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* localStorage unavailable or holds malformed JSON */
  }
  return null;
}
