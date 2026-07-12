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
import { usePrinter } from "@/hooks/usePrinter";
import {
  getPrinterConfig,
  setPrinterConfig,
  DEFAULT_PRINTER_CONFIG,
  type MobilePrintMode,
  type PrinterConfig,
} from "@/lib/printerConfig";
import { isMobilePOSDevice } from "@/lib/starPrint";

interface PrinterSettingsProps {
  /** Branch / location ID – used as the localStorage namespace key */
  locationId: string;
}

const QZ_DOWNLOAD_URL = "https://qz.io/download/";
const STAR_PRINTER_PATTERN = /\b(star|tsp|mcp|mc-print|mpop)\b/i;

export function PrinterSettings({ locationId }: PrinterSettingsProps) {
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
    return getPrinterConfig(locationId) ?? { ...DEFAULT_PRINTER_CONFIG };
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
    setConfig(getPrinterConfig(locationId) ?? { ...DEFAULT_PRINTER_CONFIG });
    setAvailablePrinters([]);
    setStatusMsg(null);
  }, [locationId]);

  // Auto-connect on mount / location change if a printer was previously saved
  const hasAutoConnected = useRef(false);
  useEffect(() => {
    if (!locationId || hasAutoConnected.current) return;
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
      setPrinterConfig(locationId, config);
      showStatus("success", "Printer settings saved");
    } catch {
      showStatus("error", "Failed to save settings");
    } finally {
      setSaving(false);
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
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? "QZ Connected" : "QZ Disconnected"}
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

      {/* Connect / Disconnect */}
      <Button
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

      {!isConnected && (
        <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md px-3 py-2">
          <strong>First time only:</strong> After clicking Connect, a QZ Tray
          security popup will appear. Click <strong>Allow</strong> and check{" "}
          <strong>"Remember this decision"</strong> to avoid the popup on future
          connections.
        </p>
      )}

      <p className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950 border border-sky-200 dark:border-sky-800 rounded-md px-3 py-2">
        <strong>Desktop:</strong> pair USB/LAN/Bluetooth Star in Windows, connect
        QZ Tray, and select the printer above.{" "}
        <strong>iPad / phone:</strong> install{" "}
        <a
          href="https://apps.apple.com/us/app/star-passprnt/id979827520"
          target="_blank"
          rel="noreferrer"
          className="underline font-medium"
        >
          Star PassPRNT
        </a>{" "}
        (Bluetooth) or set WebPRNT IP below (Wi‑Fi/LAN).
      </p>

      <Separator />

      <div className="space-y-3 rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 p-4">
        <h4 className="text-sm font-semibold">
          Mobile / iPad — Star Print
          {isMobilePOSDevice() && (
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
            <option value="passprnt">PassPRNT — Bluetooth Star (iPad/phone)</option>
            <option value="webprnt">WebPRNT — Wi‑Fi/LAN Star only</option>
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

      <Separator />

      {/* Printer selection */}
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
            size="sm"
            variant="outline"
            onClick={fetchPrinters}
            disabled={!isConnected || loadingPrinters}
          >
            {loadingPrinters ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Paper width */}
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

      <Separator />

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
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving…" : "Save Settings"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestPrint}
          disabled={!isConnected || !config.printerName || testPrinting}
        >
          {testPrinting ? "Printing…" : "Test Print"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestDrawer}
          disabled={!isConnected || !config.printerName || testDrawer}
        >
          {testDrawer ? "Opening…" : "Test Drawer"}
        </Button>
      </div>
    </div>
  );
}

export default PrinterSettings;
