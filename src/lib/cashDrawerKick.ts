/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * cashDrawerKick  the single place that physically opens the cash drawer.
 *
 * WHY THIS EXISTS
 * ───────────────
 * A receipt printed through the browser (hidden iframe + window.print()) goes
 * Chrome → Windows print driver → printer as a rasterised page. There is no
 * way to smuggle an ESC/POS drawer-kick pulse into that path, which is why the
 * drawer never opened even though the receipt always printed fine.
 *
 * So the kick is sent out-of-band through QZ Tray, which talks to the printer
 * (or to a COM port) as raw bytes. Two wirings are supported:
 *
 *   drawerConnection "printer"  drawer RJ11 → printer DK/CD port (the usual
 *       setup). The pulse is sent as a raw print job to the printer.
 *   drawerConnection "pc"       drawer → PC as a serial/virtual-COM device.
 *       The pulse is written straight to that COM port.
 *
 * SAFETY CONTRACT
 * ───────────────
 * `openCashDrawer` NEVER throws and never blocks the caller's print flow. If
 * QZ Tray is not installed, not running, or misconfigured it returns false and
 * the POS behaves exactly as it does today. Nothing about receipt printing
 * changes on any failure path.
 */

import {
  getAnyPrinterConfig,
  resolveDrawerConnection,
  type DrawerKickPin,
  type PrinterConfig,
} from "./printerConfig";
import { usesStarNativePrint } from "./starPrint";
import { getAccessToken } from "../utils/tokenStorage";
// /qz/sign now validates the SellMate access token when one is sent (and can
// require it via QZ_SIGN_REQUIRE_AUTH on the server).
const qzAuthHeader = (): Record<string, string> => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};


// ── ESC/POS drawer kick ──────────────────────────────────────────────────────
// ESC p m t1 t2  m = connector pin, t1/t2 = on/off pulse widths.
/** Pin 2 (DK pin 2)  what almost every drawer is wired to. */
export const DRAWER_KICK_PIN2 = [0x1b, 0x70, 0x00, 0x19, 0xfa];
/** Pin 5 (DK pin 5)  some Star / dual-drawer setups. */
export const DRAWER_KICK_PIN5 = [0x1b, 0x70, 0x01, 0x19, 0xfa];

export function drawerKickBytes(pin?: DrawerKickPin): number[] {
  if (pin === 5) return DRAWER_KICK_PIN5;
  if (pin === "both") return [...DRAWER_KICK_PIN2, ...DRAWER_KICK_PIN5];
  return DRAWER_KICK_PIN2;
}

// ── QZ Tray plumbing ─────────────────────────────────────────────────────────
// qz-tray is an ES module singleton, so this cache and the one inside
// usePrinter.ts resolve to the same object and share one websocket.

let qz: any = null;
let securityConfigured = false;

const BACKEND_URL =
  (import.meta as any).env?.VITE_BASE_URL || "https://api.sellmate.lk/api";

async function loadQZ(): Promise<any> {
  if (qz) return qz;
  try {
    const mod = await import("qz-tray");
    qz = (mod as any).default ?? mod;
  } catch {
    qz = null;
  }
  return qz;
}

function setupSecurity(q: any): void {
  if (securityConfigured) return;
  try {
    q.security.setCertificatePromise((resolve: (cert: string) => void) => {
      fetch(`${BACKEND_URL}/qz/certificate`)
        .then((res) => res.text())
        .then(resolve)
        .catch(() => resolve(""));
    });
    q.security.setSignatureAlgorithm("SHA512");
    q.security.setSignaturePromise((toSign: string) => {
      return (resolve: (sig: string) => void, reject: (err: any) => void) => {
        fetch(`${BACKEND_URL}/qz/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...qzAuthHeader() },
          body: JSON.stringify({ toSign }),
        })
          .then((res) => res.text())
          .then(resolve)
          .catch(reject);
      };
    });
    securityConfigured = true;
  } catch {
    /* another module already configured it */
  }
}

async function ensureConnected(): Promise<any | null> {
  const q = await loadQZ();
  if (!q) return null;
  try {
    if (q.websocket?.isActive?.()) return q;
    setupSecurity(q);
    await q.websocket.connect();
    return q;
  } catch {
    return null;
  }
}

function toBase64(bytes: number[]): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b & 0xff);
  return btoa(binary);
}

async function resolvePrinterName(
  q: any,
  conf?: PrinterConfig | null,
): Promise<string | null> {
  const named = conf?.printerName?.trim();
  if (named) return named;
  // No printer picked in settings  fall back to the OS default printer, which
  // on a POS terminal is the receipt printer the drawer hangs off anyway.
  try {
    const def = await q.printers.getDefault();
    if (typeof def === "string" && def.trim()) return def.trim();
    if (Array.isArray(def) && typeof def[0] === "string") return def[0];
  } catch {
    /* QZ could not report a default printer */
  }
  return null;
}

// ── Kick paths ───────────────────────────────────────────────────────────────

async function kickViaPrinter(conf?: PrinterConfig | null): Promise<boolean> {
  const q = await ensureConnected();
  if (!q) return false;
  const name = await resolvePrinterName(q, conf);
  if (!name) return false;
  const data = toBase64(drawerKickBytes(conf?.drawerKickPin));
  await q.print(q.configs.create(name), [
    { type: "raw", format: "base64", data },
  ]);
  return true;
}

async function kickViaSerial(conf?: PrinterConfig | null): Promise<boolean> {
  const port = conf?.drawerSerialPort?.trim();
  if (!port) return false;
  const q = await ensureConnected();
  if (!q?.serial) return false;

  const rate = conf?.drawerBaudRate ?? 9600;
  const raw = drawerKickBytes(conf?.drawerKickPin)
    .map((b) => String.fromCharCode(b & 0xff))
    .join("");

  let opened = false;
  try {
    try {
      await q.serial.openPort(port, {
        rate,
        baudRate: rate,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });
      opened = true;
    } catch (err: any) {
      // "Port is already open" is fine  anything else is a real failure.
      if (!/already/i.test(String(err?.message ?? err))) throw err;
      opened = true;
    }
    // qz-tray 2.1 and 2.2 disagree on this signature; try the new shape first.
    try {
      await q.serial.sendData(port, { type: "raw", format: "plain", data: raw });
    } catch {
      await q.serial.sendData(port, raw);
    }
    return true;
  } finally {
    if (opened) {
      try {
        await q.serial.closePort(port);
      } catch {
        /* port already closed */
      }
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Two kicks inside this window are treated as one (prevents double-pulsing). */
const DEDUPE_MS = 2000;
let lastKickAt = 0;

export interface OpenCashDrawerOptions {
  /** Printer config for the active location. Falls back to any saved config. */
  printerConf?: PrinterConfig | null;
  /** Ignore the autoOpenDrawer toggle  used by the "Test Drawer" button. */
  force?: boolean;
  /** Ignore the dedupe window  used by the "Test Drawer" button. */
  ignoreDedupe?: boolean;
}

/**
 * Open the physical cash drawer. Resolves to true only when the pulse was
 * actually handed to QZ Tray. Never throws.
 */
export async function openCashDrawer(
  options: OpenCashDrawerOptions = {},
): Promise<boolean> {
  const { force = false, ignoreDedupe = false } = options;
  try {
    // Star webPRNT / PassPRNT / mobile POS: the Star print job already carries
    // its own drawer-kick, and QZ Tray cannot run on those devices anyway.
    // Bail out before touching anything so those locations are bit-for-bit
    // unchanged by this module.
    if (usesStarNativePrint()) return false;

    const conf = options.printerConf ?? getAnyPrinterConfig();
    // A location with a Star LAN printer configured handles its drawer through
    // Star, not QZ. Leave it alone  unless this is an explicit Test Drawer.
    if (!force && conf?.starWebPrntHost?.trim()) return false;

    const mode = resolveDrawerConnection(conf);
    if (mode === "off") return false;
    if (!force && conf && conf.autoOpenDrawer === false) return false;

    const now = Date.now();
    if (!ignoreDedupe && now - lastKickAt < DEDUPE_MS) return false;
    lastKickAt = now;

    const sent =
      mode === "pc" ? await kickViaSerial(conf) : await kickViaPrinter(conf);

    // A failed attempt must not hold the dedupe window open.
    if (!sent) lastKickAt = 0;
    else console.log(`[CashDrawer] kick sent via ${mode}`);
    return sent;
  } catch (err) {
    lastKickAt = 0;
    console.error("[CashDrawer] kick failed:", err);
    return false;
  }
}

/** COM ports QZ Tray can see  for the drawer port dropdown in settings. */
export async function listSerialPorts(): Promise<string[]> {
  try {
    const q = await ensureConnected();
    if (!q?.serial) return [];
    const ports = await q.serial.findPorts();
    if (Array.isArray(ports)) return ports.filter((p) => typeof p === "string");
    if (typeof ports === "string") return [ports];
    return [];
  } catch {
    return [];
  }
}

export default openCashDrawer;
