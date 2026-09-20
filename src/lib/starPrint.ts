/**
 * Star Micronics mobile printing   WebPRNT (LAN/WiFi) and PassPRNT (Bluetooth).
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

/** Star webPRNT Browser (iOS/Android app)   user agent contains StarWebPRNTBrowser/X.X.X */
export function isStarWebPrntBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /StarWebPRNTBrowser/i.test(navigator.userAgent);
}

/** Devices that print via Star native paths instead of QZ Tray. */
export function usesStarNativePrint(): boolean {
  return isMobilePOSDevice() || isStarWebPrntBrowser();
}

/** ESC/POS: set Star roll width (58mm / 80mm). */
export function buildStarPaperWidthCommand(
  paperWidth: "58mm" | "80mm",
): number[] {
  return paperWidth === "58mm"
    ? [0x1d, 0x28, 0x57, 0x02, 0x00, 0x30, 0x02]
    : [0x1d, 0x28, 0x57, 0x02, 0x00, 0x30, 0x03];
}

/** Minimal ESC/POS test page for printer settings. */
export function buildTestEscPosCommands(
  paperWidth: "58mm" | "80mm",
  printerLabel = "Star",
): number[] {
  const enc = (str: string): number[] =>
    Array.from(new TextEncoder().encode(str.replace(/[^\x20-\x7E]/g, "?")));
  const LF = [0x0a];
  const INIT = [0x1b, 0x40];
  const BOLD_ON = [0x1b, 0x45, 0x01];
  const BOLD_OFF = [0x1b, 0x45, 0x00];
  const ALIGN_CTR = [0x1b, 0x61, 0x01];
  const ALIGN_L = [0x1b, 0x61, 0x00];
  const CUT = [0x1d, 0x56, 0x00];
  const cols = paperWidth === "58mm" ? 32 : 42;
  const sep = "-".repeat(cols);

  return [
    ...INIT,
    ...buildStarPaperWidthCommand(paperWidth),
    ...ALIGN_CTR,
    ...BOLD_ON,
    ...enc("PRINTER TEST"),
    ...LF,
    ...BOLD_OFF,
    ...enc(sep),
    ...LF,
    ...ALIGN_L,
    ...enc(`Paper:   ${paperWidth}`),
    ...LF,
    ...enc(`Printer: ${printerLabel}`),
    ...LF,
    ...enc(`Cols:    ${cols}`),
    ...LF,
    ...enc(sep),
    ...LF,
    ...ALIGN_CTR,
    ...enc("If you see this, printing works!"),
    ...LF,
    ...LF,
    ...LF,
    ...LF,
    ...CUT,
  ];
}

export const STAR_DRAWER_KICK_BYTES = [0x1b, 0x70, 0x00, 0x19, 0xfa];

const WEBPRNT_BROWSER_PATH = "/StarWebPRNT/SendMessage";
const WEBPRNT_BROWSER_TIMEOUT_MS = 8_000;

export interface WebPrntSendResult {
  ok: boolean;
  error?: string;
  endpoint?: string;
}

/** Star webPRNT Browser rejects ESC @ inside &lt;rawdata&gt;   use &lt;initialization&gt; instead. */
function stripEscInitSequences(commands: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < commands.length; i++) {
    if (commands[i] === 0x1b && commands[i + 1] === 0x40) {
      i++;
      continue;
    }
    out.push(commands[i]);
  }
  return out;
}

function commandsToBase64(commands: number[]): string {
  const uint8 = new Uint8Array(commands);
  const binary = Array.from(uint8)
    .map((b) => String.fromCharCode(b))
    .join("");
  return btoa(binary);
}

function escapeWebPrntText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** LAN/WiFi Star   raw ESC/POS in rawdata (QZ / network printers). */
export function buildWebPrntXml(commands: number[]): string {
  return `<root><rawdata>${commandsToBase64(commands)}</rawdata></root>`;
}

/** Star webPRNT Browser   compliant XML (mPOP / Bluetooth). */
export function buildWebPrntBrowserXml(commands: number[]): string {
  const stripped = stripEscInitSequences(commands);
  const parts = [
    '<root checkedblock="true">',
    '<initialization reset="false" print="false"/>',
  ];
  if (stripped.length) {
    parts.push(`<rawdata>${commandsToBase64(stripped)}</rawdata>`);
  }
  parts.push("</root>");
  return parts.join("");
}

/** Native Star XML test receipt   preferred for mPOP in webPRNT Browser. */
export function buildWebPrntNativeTestXml(
  paperWidth: "58mm" | "80mm",
): string {
  const cols = paperWidth === "58mm" ? 32 : 42;
  const sep = "-".repeat(cols);
  return [
    '<root checkedblock="true">',
    '<initialization reset="false" print="false"/>',
    '<alignment position="center"/>',
    '<text emphasis="true" width="2" height="2">PRINTER TEST\x0a</text>',
    `<text>${escapeWebPrntText(sep)}\x0a</text>`,
    '<alignment position="left"/>',
    `<text>Paper:   ${paperWidth}\x0aPrinter: mPOP\x0aCols:    ${cols}\x0a</text>`,
    `<text>${escapeWebPrntText(sep)}\x0a</text>`,
    '<alignment position="center"/>',
    "<text>If you see this, printing works!\x0a\x0a\x0a</text>",
    '<cutpaper feed="true" type="partial"/>',
    "</root>",
  ].join("");
}

export function buildWebPrntDrawerXml(): string {
  return '<root checkedblock="true"><peripheral channel="1" on="200" off="200"/></root>';
}

function parseWebPrntResponse(body: string): WebPrntSendResult {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Star bridge returned an empty response" };
  }

  const successMatch = trimmed.match(
    /<success>(true|false)<\/success>/i,
  );
  if (successMatch) {
    if (successMatch[1].toLowerCase() === "true") return { ok: true };
    const codeMatch = trimmed.match(/<code>([^<]+)<\/code>/i);
    const messageMatch = trimmed.match(/<message>([^<]+)<\/message>/i);
    return {
      ok: false,
      error:
        messageMatch?.[1] ??
        (codeMatch ? `Printer error code ${codeMatch[1]}` : "Printer rejected job"),
    };
  }

  if (/success=['"]false['"]/i.test(trimmed)) {
    return { ok: false, error: "Printer rejected job" };
  }

  if (/success=['"]true['"]/i.test(trimmed)) {
    return { ok: true };
  }

  return {
    ok: false,
    error: "Star bridge returned an unrecognized response",
  };
}

async function postStarWebPrntXml(
  xml: string,
  host: string,
  port: number,
  secure: boolean,
): Promise<WebPrntSendResult> {
  const scheme = secure ? "https" : "http";
  const endpoint = `${scheme}://${host}:${port}${WEBPRNT_BROWSER_PATH}`;

  // Star's official StarWebPrintTrader uses XMLHttpRequest, application/xml,
  // and this exact endpoint. Some Android webPRNT Browser releases do not
  // route fetch() requests through their localhost Bluetooth bridge.
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.timeout = WEBPRNT_BROWSER_TIMEOUT_MS;
    xhr.setRequestHeader("Content-Type", "application/xml; charset=UTF-8");

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        resolve({
          ok: false,
          error: `Star bridge HTTP ${xhr.status}`,
          endpoint,
        });
        return;
      }
      resolve({ ...parseWebPrntResponse(xhr.responseText ?? ""), endpoint });
    };
    xhr.onerror = () =>
      resolve({
        ok: false,
        error: "Cannot connect to Star webPRNT Bluetooth bridge",
        endpoint,
      });
    xhr.ontimeout = () =>
      resolve({
        ok: false,
        error: "Star printer connection timed out",
        endpoint,
      });

    try {
      xhr.send(xml);
    } catch (err) {
      resolve({
        ok: false,
        error: err instanceof Error ? err.message : "Failed to send print job",
        endpoint,
      });
    }
  });
}

/** Send pre-built Star XML through the webPRNT Browser localhost bridge. */
export async function sendStarWebPrntBrowserXml(
  xml: string,
): Promise<WebPrntSendResult> {
  if (!isStarWebPrntBrowser() || !xml.trim()) {
    return { ok: false, error: "Not running in Star webPRNT Browser" };
  }

  // Android webPRNT Browser requires HTTPS localhost when the POS page is
  // HTTPS. iOS legacy releases use HTTP; avoid trying both because each failed
  // attempt used to delay the fallback by up to a minute.
  const secure = /Android/i.test(navigator.userAgent)
    ? true
    : window.location.protocol === "https:";
  return postStarWebPrntXml(xml, "localhost", 8001, secure);
}

/**
 * Print ESC/POS via Star webPRNT Browser (Bluetooth printer paired in the app).
 * Converts commands to Star-compliant XML (required for mPOP).
 */
export async function tryStarWebPrntBrowserPrint(
  commands: number[],
): Promise<boolean> {
  if (!isStarWebPrntBrowser() || !commands.length) return false;
  const browser = await sendStarWebPrntBrowserXml(
    buildWebPrntBrowserXml(commands),
  );
  if (browser.ok) return true;
  const legacy = await sendStarWebPrntBrowserXml(buildWebPrntXml(commands));
  return legacy.ok;
}

export async function tryStarWebPrntBrowserTestPrint(
  paperWidth: "58mm" | "80mm",
): Promise<WebPrntSendResult> {
  return sendStarWebPrntBrowserXml(
    buildWebPrntNativeTestXml(paperWidth),
  );
}

export async function tryStarWebPrntBrowserOpenDrawer(): Promise<WebPrntSendResult> {
  return sendStarWebPrntBrowserXml(buildWebPrntDrawerXml());
}

function passPrntPaperSize(paperWidth: "58mm" | "80mm"): string {
  // Exact dot widths are preferred by current PassPRNT versions. The old
  // aliases ("2"/"3") are deprecated and vary between printer models.
  return paperWidth === "58mm" ? "384" : "576";
}

/**
 * PassPRNT renders the supplied HTML itself. Browser receipt HTML also contains
 * window.print(), which would open Android's "Save as PDF" dialog inside that
 * renderer, so scripts and inline load handlers must not be handed to PassPRNT.
 */
export function sanitizePassPrntHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\s+on(?:load|afterprint|beforeprint)\s*=\s*(["']).*?\1/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .trim();
}

const MAX_PASSPRNT_ENCODED_HTML_LENGTH = 24_000;

function applyPassPrntLayout(
  html: string,
  paperWidth: "58mm" | "80mm",
): string {
  const is58mm = paperWidth === "58mm";
  const override = `<style id="sellmate-passprnt-layout">
    @page{size:auto!important;margin:0!important}
    *{font-weight:700!important}
    html,body{width:100%!important;max-width:100%!important;margin:0!important}
    body{font-size:${is58mm ? "15px" : "16px"}!important;line-height:1.35!important;font-weight:700!important}
    .wrap{width:100%!important;max-width:100%!important;margin:0!important;padding:${is58mm ? "8px" : "12px"}!important}
    .biz-contact,.domain-line,.item-meta,.muted,.sale-number{font-size:${is58mm ? "12px" : "13px"}!important}
    .receipt-title,.thank-you{font-size:${is58mm ? "17px" : "18px"}!important}
    .section,.section div,th,td{font-size:${is58mm ? "14px" : "15px"}!important}
    .total-row td{font-size:${is58mm ? "16px" : "17px"}!important}
    .logo-img{max-width:${is58mm ? "220px" : "300px"}!important;max-height:${is58mm ? "100px" : "130px"}!important}
    .header-qr-img{width:${is58mm ? "120px" : "150px"}!important;height:${is58mm ? "120px" : "150px"}!important}
    .footer-qr-img{width:${is58mm ? "150px" : "180px"}!important;height:${is58mm ? "150px" : "180px"}!important}
    @media print{
      html,body,.wrap{width:100%!important;max-width:100%!important;margin:0!important}
    }
  </style>`;

  return /<\/head>/i.test(html)
    ? html.replace(/<\/head>/i, `${override}</head>`)
    : `${override}${html}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildCompactPassPrntHtml(
  html: string,
  paperWidth: "58mm" | "80mm",
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll("script,style,noscript,svg,img")
    .forEach((element) => element.remove());
  doc.querySelectorAll("br").forEach((element) => element.replaceWith("\n"));
  doc
    .querySelectorAll("p,div,tr,section,header,footer,h1,h2,h3,h4")
    .forEach((element) => element.append("\n"));

  const text = (doc.body.textContent ?? "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:auto;margin:0}*{font-weight:700!important}html,body{width:100%;margin:0}body{font:700 14px monospace}pre{white-space:pre-wrap;margin:0;padding:8px;font-weight:700}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}

function preparePassPrntHtml(
  html: string,
  paperWidth: "58mm" | "80mm",
): string {
  const sanitized = applyPassPrntLayout(
    sanitizePassPrntHtml(html),
    paperWidth,
  );
  if (
    encodeRfc3986(sanitized).length <= MAX_PASSPRNT_ENCODED_HTML_LENGTH
  ) {
    return sanitized;
  }

  // Embedded base64 logos/QR images can exceed Android intent URL limits and
  // make PassPRNT fail silently. Fall back to a compact text receipt.
  return buildCompactPassPrntHtml(sanitized, paperWidth);
}

/** URLSearchParams encodes spaces as '+', while PassPRNT requires RFC3986. */
function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function buildPassPrntUrl(
  html: string,
  options: {
    paperWidth?: "58mm" | "80mm";
    openDrawer?: boolean;
    backUrl?: string;
  } = {},
): string {
  const paperWidth = options.paperWidth ?? "80mm";
  const printableHtml = preparePassPrntHtml(html, paperWidth);
  const params = [
    `back=${encodeRfc3986(options.backUrl ?? window.location.href)}`,
    `html=${encodeRfc3986(printableHtml)}`,
    `size=${passPrntPaperSize(paperWidth)}`,
  ];
  if (options.openDrawer) {
    params.push("drawer=ahead");
  }
  return PASSPRNT_BASE + params.join("&");
}

function openExternalUrl(url: string): void {
  // Star's integration guide uses a top-level navigation. This is more
  // reliable than a synthetic anchor after an async sale request on Android.
  window.location.href = url;
}

/**
 * POST ESC/POS bytes to a Star printer running WebPRNT (LAN/WiFi).
 * Mixed-content: HTTPS apps cannot reach HTTP printer IPs   falls back to PassPRNT.
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
  if (isStarWebPrntBrowser()) return true;
  if (mode === "webprnt") return Boolean(config.starWebPrntHost?.trim());
  return Boolean(config.starWebPrntHost?.trim());
}

function shouldUsePassPrnt(config: PrinterConfig, mode: MobilePrintMode): boolean {
  if (mode === "browser" || mode === "webprnt") return false;
  if (mode === "passprnt") return true;
  // Star webPRNT Browser: PassPRNT was the original working path (auto fallback).
  return isIOSDevice() || isMobilePOSDevice() || isStarWebPrntBrowser();
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
  if (!usesStarNativePrint()) return false;

  const { printerConf, commands, html, openDrawer } = input;
  const mode = resolvedMobileMode(printerConf);

  // The Star Browser hides this selector, so a stale desktop "browser" value
  // must not disable its native/PassPRNT paths.
  if (mode === "browser" && !isStarWebPrntBrowser()) return false;

  // mPOP uses StarPRNT emulation by default. The backend receipt bytes are
  // ESC/POS, so the webPRNT bridge can acknowledge them without the printer
  // producing output. Use the previously working PassPRNT HTML path for sales.
  // The settings test uses native Star webPRNT XML separately.
  if (isStarWebPrntBrowser() && html) {
    return tryPassPRNT(html, {
      paperWidth: printerConf.paperWidth,
      openDrawer: openDrawer && printerConf.autoOpenDrawer,
    });
  }

  if (shouldUseWebPrnt(printerConf, mode) && commands?.length) {
    if (isStarWebPrntBrowser()) {
      const browserOk = await tryStarWebPrntBrowserPrint(commands);
      if (browserOk) return true;
    }
    if (printerConf.starWebPrntHost?.trim()) {
      const ok = await tryStarWebPRNT(
        commands,
        printerConf.starWebPrntHost,
        printerConf.starWebPrntPort ?? 8001,
        printerConf.starWebPrntSecure ?? false,
      );
      if (ok) return true;
    }
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
