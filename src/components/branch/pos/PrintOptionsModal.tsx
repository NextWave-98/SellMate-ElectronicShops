import React, { useState } from "react";
import { X, Printer, Download, CheckCircle, ChevronRight } from "lucide-react";
import useSales from "../../../hooks/useSales";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaperFormat = "a4" | "80mm" | "58mm";

export interface PrinterProfile {
  id: string;
  name: string;
  brand: string;
  description: string;
  supportedFormats: PaperFormat[];
  defaultFormat: PaperFormat;
  badge?: string;
  badgeColor?: string;
}

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId: string;
  /** Pre-selected printer id from POS default settings */
  defaultPrinterId?: string;
  /** Pre-selected paper format from POS default settings */
  defaultFormat?: PaperFormat;
}

// ─── Printer catalogue ────────────────────────────────────────────────────────

const PRINTERS: PrinterProfile[] = [
  {
    id: "star-micronics-bluetooth",
    name: "Star Micronics Bluetooth / iPad",
    brand: "Star Micronics",
    description:
      "Star thermal receipts • Bluetooth paired printer / iPad AirPrint/browser print • 80mm default",
    supportedFormats: ["80mm", "58mm"],
    defaultFormat: "80mm",
    badge: "⭐ iPad",
    badgeColor: "bg-sky-100 text-sky-800",
  },
  {
    id: "epson-tm-t82iii",
    name: "Epson TM-T82III",
    brand: "Epson",
    description:
      "Professional 80mm thermal • USB / LAN / Serial • Auto-cutter • ESC/POS",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
    badge: "🏆 Popular",
    badgeColor: "bg-yellow-100 text-yellow-800",
  },
  {
    id: "xprinter-xp-80c",
    name: "Xprinter XP-80C",
    brand: "Xprinter",
    description:
      "Budget 80mm thermal • USB / LAN • ESC/POS • Good for small shops",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
    badge: "💰 Budget",
    badgeColor: "bg-green-100 text-green-800",
  },
  {
    id: "bixolon-srp-350iii",
    name: "Bixolon SRP-350III",
    brand: "Bixolon",
    description:
      "High-speed 80mm • USB / Serial / Ethernet • Strong driver support",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
    badge: "⚡ High-speed",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  {
    id: "zkteco-zkp8001",
    name: "ZKTeco ZKP8001",
    brand: "ZKTeco",
    description: "Affordable USB thermal • Simple billing • ESC/POS",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
    badge: "🔌 Simple",
    badgeColor: "bg-purple-100 text-purple-800",
  },
  {
    id: "sunmi-cloud",
    name: "Sunmi Cloud Printer",
    brand: "Sunmi",
    description:
      "Cloud / Wi-Fi printing • Print from mobile or web • Modern POS",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
    badge: "📶 Cloud",
    badgeColor: "bg-teal-100 text-teal-800",
  },
  {
    id: "generic-a4",
    name: "Generic A4 Printer",
    brand: "Any",
    description: "Standard office / inkjet / laser • Full-page A4 invoice",
    supportedFormats: ["a4"],
    defaultFormat: "a4",
    badge: "📄 A4",
    badgeColor: "bg-gray-100 text-gray-700",
  },
  {
    id: "generic-thermal",
    name: "Generic Thermal Printer",
    brand: "Any",
    description: "Any ESC/POS compatible thermal printer • 58mm or 80mm paper",
    supportedFormats: ["80mm", "58mm"],
    defaultFormat: "80mm",
    badge: "🔧 Generic",
    badgeColor: "bg-orange-100 text-orange-800",
  },
];

const FORMAT_LABELS: Record<
  PaperFormat,
  { label: string; detail: string; icon: string }
> = {
  a4: { label: "A4", detail: "210 × 297 mm – full invoice", icon: "📄" },
  "80mm": {
    label: "80mm",
    detail: "80 mm receipt – standard thermal",
    icon: "🧾",
  },
  "58mm": { label: "58mm", detail: "58 mm receipt – mini thermal", icon: "📋" },
};

// ─── Component ────────────────────────────────────────────────────────────────

const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  isOpen,
  onClose,
  saleId,
  defaultPrinterId,
  defaultFormat: defaultFmt,
}) => {
  const { silentPrintInvoice, downloadInvoice } = useSales();

  const resolvedPrinter =
    PRINTERS.find((p) => p.id === defaultPrinterId) ?? PRINTERS[0];
  const resolvedFormat: PaperFormat =
    defaultFmt && resolvedPrinter.supportedFormats.includes(defaultFmt)
      ? defaultFmt
      : resolvedPrinter.defaultFormat;

  const [selectedPrinter, setSelectedPrinter] =
    useState<PrinterProfile>(resolvedPrinter);
  const [selectedFormat, setSelectedFormat] =
    useState<PaperFormat>(resolvedFormat);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Re-apply defaults whenever they change (e.g. modal re-opens)
  React.useEffect(() => {
    const p = PRINTERS.find((pr) => pr.id === defaultPrinterId) ?? PRINTERS[0];
    setSelectedPrinter(p);
    setSelectedFormat(
      defaultFmt && p.supportedFormats.includes(defaultFmt)
        ? defaultFmt
        : p.defaultFormat,
    );
  }, [defaultPrinterId, defaultFmt, isOpen]);

  if (!isOpen) return null;

  const selectPrinter = (printer: PrinterProfile) => {
    setSelectedPrinter(printer);
    // auto-pick the best format for this printer
    if (!printer.supportedFormats.includes(selectedFormat)) {
      setSelectedFormat(printer.defaultFormat);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      await silentPrintInvoice(saleId, { format: selectedFormat });
      toast.success(
        `Sent to default printer (${selectedPrinter.name}, ${selectedFormat})`,
        { duration: 3000 },
      );
    } catch {
      toast.error("Failed to print. Check that your printer is connected.");
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadInvoice(saleId, { format: selectedFormat });
      toast.success(`Downloaded (${selectedFormat} format)`, {
        duration: 3000,
      });
    } catch {
      toast.error("Failed to download invoice.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-orange-50 p-2 rounded-lg">
              <Printer className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Print Options</h2>
              <p className="text-xs text-gray-500">
                Choose your printer and paper size
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Step 1: Choose Printer ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              Select Printer Model
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRINTERS.map((printer) => {
                const isSelected = selectedPrinter.id === printer.id;
                return (
                  <button
                    key={printer.id}
                    onClick={() => selectPrinter(printer)}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30"
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold ${isSelected ? "text-orange-700" : "text-gray-800"}`}
                        >
                          {printer.name}
                        </span>
                        {printer.badge && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${printer.badgeColor}`}
                          >
                            {printer.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {printer.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Step 2: Choose Paper Size ── */}
          <section>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              Select Paper Size
            </h3>
            <div className="flex gap-3 flex-wrap">
              {(Object.keys(FORMAT_LABELS) as PaperFormat[]).map((fmt) => {
                const available =
                  selectedPrinter.supportedFormats.includes(fmt);
                const isSelected = selectedFormat === fmt;
                const info = FORMAT_LABELS[fmt];
                return (
                  <button
                    key={fmt}
                    disabled={!available}
                    onClick={() => available && setSelectedFormat(fmt)}
                    className={`flex-1 min-w-32.5 flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 transition-all ${
                      !available
                        ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                        : isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer"
                    }`}
                  >
                    <span className="text-2xl">{info.icon}</span>
                    <span
                      className={`text-sm font-bold ${isSelected ? "text-orange-700" : "text-gray-700"}`}
                    >
                      {info.label}
                    </span>
                    <span className="text-xs text-gray-500 text-center leading-tight">
                      {info.detail}
                    </span>
                    {isSelected && available && (
                      <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Summary ── */}
          <section className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">
                {selectedPrinter.name}
              </span>{" "}
              <ChevronRight className="w-3.5 h-3.5 inline text-gray-400" />{" "}
              <span className="font-semibold text-orange-600">
                {FORMAT_LABELS[selectedFormat].label}
              </span>{" "}
              receipt &nbsp;·&nbsp;
              {selectedFormat !== "a4"
                ? `Thermal ${selectedFormat} paper – compatible with ESC/POS`
                : "Full A4 professional invoice"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Tip: For iPad/Bluetooth Star printers, pair the printer first and
              choose it in the iPad print dialog. Desktop direct Bluetooth
              printing uses the OS/QZ Tray printer name.
            </p>
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              disabled={isPrinting || isDownloading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
            >
              <Printer className="w-4 h-4" />
              {isPrinting
                ? "Sending to printer…"
                : `Print  (${FORMAT_LABELS[selectedFormat].label})`}
            </button>
            <button
              onClick={handleDownload}
              disabled={isPrinting || isDownloading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
            >
              <Download className="w-4 h-4" />
              {isDownloading
                ? "Downloading…"
                : `Download (${FORMAT_LABELS[selectedFormat].label})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintOptionsModal;
