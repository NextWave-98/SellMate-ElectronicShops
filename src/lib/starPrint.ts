/**
 * Star Micronics mobile printing — WebPRNT (LAN/WiFi) and PassPRNT (Bluetooth).
 * Desktop QZ Tray path is unchanged; these helpers run only on mobile/iPad.
 */

import type { MobilePrintMode, PrinterConfig } from "./printerConfig";

const WEBPRNT_PATH = "/StarWebPRNT/SendMessage";
const PASSPRNT_BASE = "starpassprnt://v1/print/nopreview?";

/** iPadOS 13+ reports as MacIntel with touch. */
export function isIOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Mobile POS devices where QZ Tray is unavailable. */
export function isMobilePOSDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return isIOSDevice() || /Android/i.test(navigator.userAgent);
}

function commandsToBase64(commands: number[]): string {
  const uint8 = new Uint8Array(commands);
  const binary = Array.from(uint8)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}

/** Star WebPRNT raw ESC/POS XML (base64-encoded). */
export function buildWebPrntXml(commands: number[]): string {
  return `<root><rawdata>${commandsToBase64(commands)}</rawdata></root>`;
}

function passPrntPaperSize(paperWidth: "58mm" | "80mm"): string {
  return paperWidth === "58mm" ? "2" : "3";
}

export function buildPassPrntUrl(
  html: string,
  options: {
    paperWidth?: "58mm" | "80mm";
    openDrawer?: boolean;
    backUrl?: string;
  } = {},
): string {
  const params = new URLSearchParams();
  params.set("back", options.backUrl ?? window.location.href);
  params.set("html", html);
  params.set("size", passPrntPaperSize(options.paperWidth ?? "80mm"));
  if (options.openDrawer) {
    params.set("drawer", "ahead");
  }
  return PASSPRNT_BASE + params.toString();
}

function openExternalUrl(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

/**
 * POST ESC/POS bytes to a Star printer running WebPRNT (LAN/WiFi).
 * Mixed-content: HTTPS apps cannot reach HTTP printer IPs — falls back to PassPRNT.
 */
export async function tryStarWebPRNT(
  commands: number[],
  host: string,
  port = 8001,
  secure = false,
): Promise<boolean> {
  const trimmed = host.trim();
  if (!trimmed || !commands.length) return false;

  const scheme = secure ? "https" : "http";
  const endpoint = `${scheme}://${trimmed}:${port}${WEBPRNT_PATH}`;
  const body = buildWebPrntXml(commands);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "text/xml; charset=UTF-8" },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[StarPrint] WebPRNT HTTP ${res.status}`);
      return false;
    }
    console.log("[StarPrint] WebPRNT job sent");
    return true;
  } catch (err) {
    console.error("[StarPrint] WebPRNT failed:", err);
    return false;
  }
}

/** Launch Star PassPRNT with receipt HTML (Bluetooth / iPad). */
export function tryPassPRNT(
  html: string,
  options: {
    paperWidth?: "58mm" | "80mm";
    openDrawer?: boolean;
  } = {},
): boolean {
  if (!html?.includes("<")) return false;
  try {
    const url = buildPassPrntUrl(html, options);
    openExternalUrl(url);
    console.log("[StarPrint] PassPRNT launched");
    return true;
  } catch (err) {
    console.error("[StarPrint] PassPRNT failed:", err);
    return false;
  }
}

function resolvedMobileMode(config: PrinterConfig): MobilePrintMode {
  return config.mobilePrintMode ?? "auto";
}

function shouldUseWebPrnt(config: PrinterConfig, mode: MobilePrintMode): boolean {
  if (mode === "browser" || mode === "passprnt") return false;
  if (mode === "webprnt") return Boolean(config.starWebPrntHost?.trim());
  return Boolean(config.starWebPrntHost?.trim());
}

function shouldUsePassPrnt(config: PrinterConfig, mode: MobilePrintMode): boolean {
  if (mode === "browser" || mode === "webprnt") return false;
  if (mode === "passprnt") return true;
  return isIOSDevice() || isMobilePOSDevice();
}

export interface StarMobilePrintInput {
  printerConf: PrinterConfig;
  commands?: number[];
  html?: string;
  openDrawer?: boolean;
}

/**
 * Try Star-native mobile print. Returns true if a job was dispatched.
 * Order: WebPRNT (if host configured) → PassPRNT (iOS/mobile) → false.
 */
export async function tryStarMobilePrint(
  input: StarMobilePrintInput,
): Promise<boolean> {
  if (!isMobilePOSDevice()) return false;

  const { printerConf, commands, html, openDrawer } = input;
  const mode = resolvedMobileMode(printerConf);

  if (mode === "browser") return false;

  if (shouldUseWebPrnt(printerConf, mode) && commands?.length) {
    const ok = await tryStarWebPRNT(
      commands,
      printerConf.starWebPrntHost!,
      printerConf.starWebPrntPort ?? 8001,
      printerConf.starWebPrntSecure ?? false,
    );
    if (ok) return true;
  }

  if (shouldUsePassPrnt(printerConf, mode) && html) {
    return tryPassPRNT(html, {
      paperWidth: printerConf.paperWidth,
      openDrawer: openDrawer && printerConf.autoOpenDrawer,
    });
  }

  return false;
}

/** iOS Safari: open receipt HTML in a new tab (iframe print is blocked). */
export function printHtmlInNewTab(html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {
    showPrintFallbackBanner(url);
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function showPrintFallbackBanner(blobUrl: string): void {
  const existing = document.getElementById("star-print-fallback-banner");
  if (existing) existing.remove();

  const banner = document.createElement("div");
  banner.id = "star-print-fallback-banner";
  banner.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;background:#1e40af;color:#fff;padding:12px 16px;text-align:center;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.2);";
  banner.innerHTML =
    '🖨️ <a href="' +
    blobUrl +
    '" target="_blank" rel="noopener" style="color:#fde68a;font-weight:600;text-decoration:underline;">Tap here to print receipt</a>' +
    ' &nbsp;|&nbsp; Bluetooth Star? Install <strong>Star PassPRNT</strong> and configure mobile printer settings.';
  document.body.appendChild(banner);
  setTimeout(() => {
    try {
      banner.remove();
    } catch {
      /* ignore */
    }
  }, 120_000);
}

/** Shown when browser/AirPrint finds no suitable printer on mobile. */
export function showAirPrintFallbackHint(): void {
  const existing = document.getElementById("star-airprint-hint");
  if (existing) return;

  const hint = document.createElement("div");
  hint.id = "star-airprint-hint";
  hint.style.cssText =
    "position:fixed;bottom:16px;left:16px;right:16px;z-index:99998;background:#0c4a6e;color:#e0f2fe;padding:10px 14px;border-radius:8px;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.15);";
  hint.innerHTML =
    "<strong>Bluetooth Star printer?</strong> AirPrint cannot see it. " +
    "Set <em>Mobile print → PassPRNT</em> in Printer Settings and install the Star PassPRNT app.";
  document.body.appendChild(hint);
  setTimeout(() => {
    try {
      hint.remove();
    } catch {
      /* ignore */
    }
  }, 15_000);
}
