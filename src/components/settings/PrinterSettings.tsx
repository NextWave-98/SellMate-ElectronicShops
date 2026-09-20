/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PrinterSettings – Per-location ESC/POS printer configuration UI.
 *
 * Allows staff to:
 *  • Connect / disconnect QZ Tray
 *  • Pick the correct thermal printer from a dropdown
 *  • Choose paper width (58 mm or 80 mm)
 *  • Enable auto-print and auto-open-drawer on sale completion
 *  • Test print a receipt and test the cash-drawer kick
 *
 * Configuration is stored in localStorage with key `printer_config_{locationId}`.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { usePrinter } from "@/hooks/usePrinter";
import {
  getPrinterConfig,
  setPrinterConfig,
  DEFAULT_PRINTER_CONFIG,
  type MobilePrintMode,
  type PrinterConfig,
} from "@/lib/printerConfig";
import {
  isMobilePOSDevice,
  isStarWebPrntBrowser,
  tryPassPRNT,
  tryStarWebPrntBrowserOpenDrawer,
  tryStarWebPrntBrowserTestPrint,
} from "@/lib/starPrint";

function buildPassPrntTestHtml(paperWidth: "58mm" | "80mm"): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: ${paperWidth} auto; margin: 2mm; }
    body { width: ${paperWidth}; margin: 0; font-family: monospace; text-align: center; }
    hr { border: 0; border-top: 1px dashed #000; }
  </style></head><body>
    <h2>SELLMATE</h2><hr><p>PassPRNT test successful</p>
    <p>Paper: ${paperWidth}</p><hr><p>Printer settings are ready.</p>
  </body></html>`;
}

interface PrinterSettingsProps {
  /** Branch / location ID – used as the localStorage namespace key */
  locationId: string;
}

const QZ_DOWNLOAD_URL = "https://qz.io/download/";
const STAR_PRINTER_PATTERN = /\b(star|tsp|mcp|mc-print|mpop)\b/i;

export function PrinterSettings({ locationId }: PrinterSettingsProps) {
  const isStarBrowser = isStarWebPrntBrowser();
  const isMobile = isMobilePOSDevice() && !isStarBrowser;
  const isQzDesktop = !isMobile && !isStarBrowser;
  const {
    isConnected,
    error,
    connect,
    disconnect,
    getAvailablePrinters,
    printESCPOS,
    openDrawerOnly,
  } = usePrinter();

  const [config, setConfig] = useState<PrinterConfig>(() => {
    const saved = getPrinterConfig(locationId);
    if (saved) return saved;
    return { ...DEFAULT_PRINTER_CONFIG };
  });
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [testDrawer, setTestDrawer] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Reload config whenever locationId changes
  useEffect(() => {
    const saved = getPrinterConfig(locationId);
    setConfig(
      saved ?? { ...DEFAULT_PRINTER_CONFIG },
    );
    setAvailablePrinters([]);
    setStatusMsg(null);
  }, [locationId, isStarBrowser]);

  // Auto-connect on mount / location change if a printer was previously saved
  const hasAutoConnected = useRef(false);
  useEffect(() => {
    if (!locationId || hasAutoConnected.current || isStarBrowser) return;
    const saved = getPrinterConfig(locationId);
    if (saved?.printerName && !isConnected) {
      hasAutoConnected.current = true;
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  // Auto-load printer list once connected
  useEffect(() => {
    if (isConnected) {
      fetchPrinters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  const showStatus = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  // ── Fetch available printers ───────────────────────────────────────────────

  const fetchPrinters = useCallback(async () => {
    setLoadingPrinters(true);
    try {
      const list = await getAvailablePrinters();
      setAvailablePrinters(list);
      setConfig((prev) => {
        if (prev.printerName) return prev;
        const starPrinter = list.find((name) =>
          STAR_PRINTER_PATTERN.test(name),
        );
        return starPrinter
          ? { ...prev, printerName: starPrinter, paperWidth: "80mm" }
          : prev;
      });
    } catch (err: any) {
      showStatus("error", err?.message ?? "Could not list printers");
    } finally {
      setLoadingPrinters(false);
    }
  }, [getAvailablePrinters]);

  // ── Connect / disconnect ───────────────────────────────────────────────────

  const handleToggleConnection = async () => {
    if (isConnected) {
      await disconnect();
      setAvailablePrinters([]);
    } else {
      await connect();
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = () => {
    setSaving(true);
    try {
      if (!locationId) {
        throw new Error("Select a branch before saving printer settings");
      }
      setPrinterConfig(locationId, config);
      const saved = getPrinterConfig(locationId);
      if (!saved || JSON.stringify(saved) !== JSON.stringify(config)) {
        throw new Error("Browser storage has not retained the printer settings");
      }
      showStatus("success", "Printer settings saved");
      toast.success("PassPRNT settings saved on this device");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save printer settings";
      showStatus("error", message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleStarBrowserTestPrint = async () => {
    setTestPrinting(true);
    try {
      const result = await tryStarWebPrntBrowserTestPrint(config.paperWidth);
      if (result.ok) {
        showStatus("success", "Test page sent to mPOP");
        toast.success("Test print sent");
        return;
      }

      // Previous working path: PassPRNT HTML (before Star-browser localhost routing).
      const launched = tryPassPRNT(buildPassPrntTestHtml(config.paperWidth), {
        paperWidth: config.paperWidth,
      });
      if (launched) {
        showStatus("success", "Opening PassPRNT test print…");
        toast.success("WebPRNT unavailable   opened PassPRNT");
        return;
      }

      const message =
        result.error ??
        "Print failed   pair mPOP in Star webPRNT Browser or install PassPRNT";
      showStatus("error", message);
      toast.error(message);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Test print failed";
      showStatus("error", message);
    } finally {
      setTestPrinting(false);
    }
  };

  const handleStarBrowserDrawer = async () => {
    setTestDrawer(true);
    try {
      const result = await tryStarWebPrntBrowserOpenDrawer();
      if (result.ok) {
        showStatus("success", "Drawer kick sent");
      } else {
        showStatus(
          "error",
          result.error ?? "Drawer kick failed   check mPOP Bluetooth pairing",
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Drawer test failed";
      showStatus("error", message);
    } finally {
      setTestDrawer(false);
    }
  };

  const handleMobileTestPrint = () => {
    const width = config.paperWidth;
    const launched = tryPassPRNT(buildPassPrntTestHtml(width), {
      paperWidth: width,
    });

    if (launched) {
      toast.success("Opening Star PassPRNT…");
    } else {
      toast.error("Could not open Star PassPRNT");
    }
  };

  // ── Test print ─────────────────────────────────────────────────────────────

  const handleTestPrint = async () => {
    if (!config.printerName) {
      showStatus("error", "Please select a printer first");
      return;
    }
    setTestPrinting(true);
    try {
      // Build a minimal ESC/POS test page
      const enc = (str: string): number[] =>
        Array.from(new TextEncoder().encode(str.replace(/[^\x20-\x7E]/g, "?")));
      const LF = [0x0a];
      const INIT = [0x1b, 0x40];
      const BOLD_ON = [0x1b, 0x45, 0x01];
      const BOLD_OFF = [0x1b, 0x45, 0x00];
      const ALIGN_CTR = [0x1b, 0x61, 0x01];
      const ALIGN_L = [0x1b, 0x61, 0x00];
      const CUT = [0x1d, 0x56, 0x00];
      const cols = config.paperWidth === "58mm" ? 32 : 42;
      const sep = "-".repeat(cols);

      const cmds: number[] = [
        ...INIT,
        ...ALIGN_CTR,
        ...BOLD_ON,
        ...enc("PRINTER TEST"),
        ...LF,
        ...BOLD_OFF,
        ...enc(sep),
        ...LF,
        ...ALIGN_L,
        ...enc(`Paper:   ${config.paperWidth}`),
        ...LF,
        ...enc(`Printer: ${config.printerName}`),
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

      await printESCPOS(cmds, config.printerName);
      showStatus("success", "Test page sent to printer");
    } catch (err: any) {
      showStatus("error", err?.message ?? "Test print failed");
    } finally {
      setTestPrinting(false);
    }
  };

  // ── Test drawer ────────────────────────────────────────────────────────────

  const handleTestDrawer = async () => {
    if (!config.printerName) {
      showStatus("error", "Please select a printer first");
      return;
    }
    setTestDrawer(true);
    try {
      await openDrawerOnly(config.printerName);
      showStatus("success", "Drawer kick sent");
    } catch (err: any) {
      showStatus("error", err?.message ?? "Drawer test failed");
    } finally {
      setTestDrawer(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border bg-card p-5 space-y-5 max-w-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Thermal Printer (ESC/POS)</h3>
        <Badge variant={isStarBrowser || isMobile || isConnected ? "default" : "secondary"}>
          {isStarBrowser
            ? "Star webPRNT Browser"
            : isMobile
              ? "PassPRNT Mobile"
              : isConnected
                ? "QZ Connected"
                : "QZ Disconnected"}
        </Badge>
      </div>

      {/* Error / status message */}
      {(error || statusMsg) && (
        <div
          className={`text-sm px-3 py-2 rounded-md ${
            statusMsg?.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {statusMsg?.text ?? error}
          {!isConnected && (error ?? "").includes("not running") && (
            <a
              href={QZ_DOWNLOAD_URL}
              target="_blank"
              rel="noreferrer"
              className="ml-2 underline font-medium"
            >
              Download QZ Tray
            </a>
          )}
        </div>
      )}

      {!isMobile && !isStarBrowser && (
        <>
          {/* Connect / Disconnect */}
          <Button
            type="button"
            variant={isConnected ? "outline" : "default"}
            onClick={handleToggleConnection}
            size="sm"
          >
            {isConnected ? "Disconnect QZ Tray" : "Connect QZ Tray"}
          </Button>

          {!isConnected && (
            <p className="text-xs text-muted-foreground">
              QZ Tray must be running on this computer.{" "}
              <a
                href={QZ_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Download QZ Tray
              </a>
            </p>
          )}
        </>
      )}

      {isStarBrowser ? (
        <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-md px-3 py-2">
          In <strong>Star webPRNT Browser → Settings</strong>, select{" "}
          <strong>MODEL: mPOP (StarPRNT)</strong> and choose the paired mPOP
          under <strong>SELECTED PRINTER</strong>. No QZ Tray is needed. Then
          keep Paper Width at 58mm, save, and tap Test Print.
        </p>
      ) : isMobile ? (
        <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-md px-3 py-2">
          Select the mPOP inside <strong>Star PassPRNT</strong>. Mobile printers
          do not appear in the desktop QZ printer list.
        </p>
      ) : (
        <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-md px-3 py-2">
          Pair the USB/LAN/Bluetooth Star printer in Windows, connect QZ Tray,
          and select the printer below.
        </p>
      )}

      {isStarBrowser && (
        <>
          <div className="space-y-2 rounded-md border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4">
            <Label className="text-sm font-semibold">
              Receipt print size (paper roll width)
            </Label>
            <p className="text-xs text-amber-900 dark:text-amber-100">
              Star webPRNT Browser does not show a browser print dialog. SellMate
              tries localhost WebPRNT first, then <strong>PassPRNT</strong> (the
              method that worked before). mPOP uses <strong>58mm</strong>. Its
              factory emulation is StarPRNT, so MODEL must normally be{" "}
              <strong>mPOP (StarPRNT)</strong>, not plain mPOP.
            </p>
            <div className="flex gap-4 pt-1">
              {(["80mm", "58mm"] as const).map((w) => (
                <label
                  key={w}
                  className="flex items-center gap-2 cursor-pointer text-sm font-medium"
                >
                  <input
                    type="radio"
                    name="paperWidthStar"
                    value={w}
                    checked={config.paperWidth === w}
                    onChange={() =>
                      setConfig((prev) => ({ ...prev, paperWidth: w }))
                    }
                  />
                  {w}
                </label>
              ))}
            </div>
            {config.paperWidth === "58mm" && (
              <p className="text-xs text-amber-800 dark:text-amber-200">
                58mm selected   if print looks small on the left with empty
                space, switch to 80mm.
              </p>
            )}
          </div>
          <Separator />
        </>
      )}

      {!isStarBrowser && (
      <div className="space-y-3 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 p-4">
        <h4 className="text-sm font-semibold">
          Mobile / iPad   Star Print
          {(isMobilePOSDevice()) && (
            <Badge variant="default" className="ml-2 text-xs">
              This device
            </Badge>
          )}
        </h4>

        <div className="space-y-1.5">
          <Label htmlFor="mobile-print-mode">Mobile print mode</Label>
          <select
            id="mobile-print-mode"
            className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
            value={config.mobilePrintMode ?? "auto"}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                mobilePrintMode: e.target.value as MobilePrintMode,
              }))
            }
          >
            <option value="auto">Auto (WebPRNT if IP set, else PassPRNT)</option>
            <option value="passprnt">PassPRNT   Bluetooth Star (iPad/phone)</option>
            <option value="webprnt">WebPRNT   Wi‑Fi/LAN Star only</option>
            <option value="browser">Browser / AirPrint only</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="webprnt-host">WebPRNT printer IP / hostname</Label>
          <input
            id="webprnt-host"
            type="text"
            placeholder="e.g. 192.168.1.50"
            className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
            value={config.starWebPrntHost ?? ""}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                starWebPrntHost: e.target.value,
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            LAN/Wi‑Fi Star only. Enable WebPRNT on the printer (port 8001).
          </p>
        </div>

        <div className="flex gap-3">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="webprnt-port">Port</Label>
            <input
              id="webprnt-port"
              type="number"
              min={1}
              max={65535}
              className="w-full border rounded-md px-3 py-1.5 text-sm bg-background"
              value={config.starWebPrntPort ?? 8001}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  starWebPrntPort: parseInt(e.target.value, 10) || 8001,
                }))
              }
            />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={config.starWebPrntSecure ?? false}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    starWebPrntSecure: e.target.checked,
                  }))
                }
              />
              HTTPS
            </label>
          </div>
        </div>
      </div>
      )}

      <Separator />

      {/* QZ printer selection is desktop-only; PassPRNT / webPRNT Browser own mobile selection. */}
      {!isMobile && !isStarBrowser && (
        <div className="space-y-1.5">
          <Label htmlFor="printer-select">Printer</Label>
          <div className="flex gap-2">
            <select
              id="printer-select"
              className="flex-1 border rounded-md px-3 py-1.5 text-sm bg-background"
              value={config.printerName}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, printerName: e.target.value }))
              }
            >
              <option value="">-- select a printer --</option>
              {availablePrinters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={fetchPrinters}
              disabled={!isConnected || loadingPrinters}
            >
              {loadingPrinters ? "Loading…" : "Refresh"}
            </Button>
          </div>
        </div>
      )}

      {/* Paper width (desktop / PassPRNT   Star browser uses highlighted block above) */}
      {!isStarBrowser && (
      <div className="space-y-1.5">
        <Label>Paper Width</Label>
        <div className="flex gap-4">
          {(["80mm", "58mm"] as const).map((w) => (
            <label
              key={w}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <input
                type="radio"
                name="paperWidth"
                value={w}
                checked={config.paperWidth === w}
                onChange={() =>
                  setConfig((prev) => ({ ...prev, paperWidth: w }))
                }
              />
              {w}
            </label>
          ))}
        </div>
      </div>
      )}

      {!isStarBrowser && <Separator />}

      {/* Behaviour toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-print" className="cursor-pointer">
            Auto-print receipt after sale
          </Label>
          <Switch
            id="auto-print"
            checked={config.autoPrintOnSale}
            onCheckedChange={(v) =>
              setConfig((prev) => ({ ...prev, autoPrintOnSale: v }))
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-drawer" className="cursor-pointer">
            Auto-open cash drawer on sale
          </Label>
          <Switch
            id="auto-drawer"
            checked={config.autoOpenDrawer}
            onCheckedChange={(v) =>
              setConfig((prev) => ({ ...prev, autoOpenDrawer: v }))
            }
          />
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            isStarBrowser
              ? handleStarBrowserTestPrint
              : isMobile
                ? handleMobileTestPrint
                : handleTestPrint
          }
          disabled={
            isStarBrowser
              ? testPrinting
              : isMobile
                ? testPrinting ||
                  (config.mobilePrintMode === "browser" &&
                    !config.starWebPrntHost?.trim())
                : !isConnected || !config.printerName || testPrinting
          }
        >
          {testPrinting
            ? "Printing…"
            : isStarBrowser
              ? "Test Print"
              : isMobile
                ? "Test PassPRNT"
                : "Test Print"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={
            isStarBrowser ? handleStarBrowserDrawer : handleTestDrawer
          }
          disabled={
            isStarBrowser
              ? testDrawer
              : !isConnected || !config.printerName || testDrawer
          }
        >
          {testDrawer ? "Opening…" : "Test Drawer"}
        </Button>
      </div>
    </div>
  );
}

export default PrinterSettings;
