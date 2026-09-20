import React, { useState, useEffect, useCallback } from "react";
import {
  Printer,
  ScanLine,
  Wallet,
  CheckCircle,
  RotateCcw,
  Save,
  Settings2,
  ChevronDown,
  Loader2,
  Building2,
  Receipt,
  MessageCircle,
  Truck,
  Monitor,
} from "lucide-react";
import toast from "react-hot-toast";
import useFetch from "../../hooks/useFetch";
import type {
  PaperFormat,
  BarcodeReaderType,
  POSSettings,
} from "../../hooks/usePOSSettings";
import PrinterSettings from "../../components/settings/PrinterSettings";
import useBusinessProfile from "../../hooks/useBusinessProfile";

// ─── Printer catalogue (kept in sync with PrintOptionsModal) ─────────────────

const PRINTERS: Array<{
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  supportedFormats: PaperFormat[];
  defaultFormat: PaperFormat;
}> = [
  {
    id: "star-micronics-bluetooth",
    name: "Star Micronics Bluetooth / iPad",
    badge: "⭐ iPad",
    badgeColor: "bg-sky-100 text-sky-800",
    description:
      "Star thermal receipts • Bluetooth paired printer / iPad AirPrint/browser print",
    supportedFormats: ["80mm", "58mm"],
    defaultFormat: "80mm",
  },
  {
    id: "epson-tm-t82iii",
    name: "Epson TM-T82III",
    badge: "🏆 Popular",
    badgeColor: "bg-yellow-100 text-yellow-800",
    description: "Professional 80mm thermal • USB / LAN / Serial",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
  },
  {
    id: "xprinter-xp-80c",
    name: "Xprinter XP-80C",
    badge: "💰 Budget",
    badgeColor: "bg-green-100  text-green-800",
    description: "Budget 80mm thermal • USB / LAN",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
  },
  {
    id: "bixolon-srp-350iii",
    name: "Bixolon SRP-350III",
    badge: "⚡ High-speed",
    badgeColor: "bg-orange-100   text-orange-800",
    description: "High-speed 80mm • USB / Serial / Ethernet",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
  },
  {
    id: "zkteco-zkp8001",
    name: "ZKTeco ZKP8001",
    badge: "🔌 Simple",
    badgeColor: "bg-purple-100 text-purple-800",
    description: "Affordable USB thermal • ESC/POS",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
  },
  {
    id: "sunmi-cloud",
    name: "Sunmi Cloud Printer",
    badge: "📶 Cloud",
    badgeColor: "bg-teal-100   text-teal-800",
    description: "Cloud / Wi-Fi printing from mobile or web",
    supportedFormats: ["80mm", "58mm", "a4"],
    defaultFormat: "80mm",
  },
  {
    id: "generic-a4",
    name: "Generic A4 Printer",
    badge: "📄 A4",
    badgeColor: "bg-gray-100   text-gray-700",
    description: "Standard office / inkjet / laser – A4 invoice",
    supportedFormats: ["a4"],
    defaultFormat: "a4",
  },
  {
    id: "generic-thermal",
    name: "Generic Thermal Printer",
    badge: "🔧 Generic",
    badgeColor: "bg-orange-100 text-orange-800",
    description: "Any ESC/POS compatible thermal – 58mm or 80mm",
    supportedFormats: ["80mm", "58mm"],
    defaultFormat: "80mm",
  },
];

const PAPER_FORMATS: {
  id: PaperFormat;
  label: string;
  icon: string;
  detail: string;
}[] = [
  {
    id: "80mm",
    label: "80mm",
    icon: "🧾",
    detail: "80 mm receipt – standard thermal",
  },
  {
    id: "58mm",
    label: "58mm",
    icon: "📋",
    detail: "58 mm receipt – mini thermal",
  },
  { id: "a4", label: "A4", icon: "📄", detail: "210 × 297 mm – full invoice" },
];

const BARCODE_READERS: {
  id: BarcodeReaderType;
  label: string;
  icon: string;
  detail: string;
}[] = [
  {
    id: "usb",
    label: "USB Scanner",
    icon: "🔌",
    detail: "Wired USB barcode scanner (most common)",
  },
  {
    id: "bluetooth",
    label: "Bluetooth Scanner",
    icon: "📡",
    detail: "Wireless Bluetooth scanner",
  },
  {
    id: "camera",
    label: "Camera / Phone",
    icon: "📷",
    detail: "Use device camera to scan barcodes",
  },
  { id: "none", label: "No Scanner", icon: "🚫", detail: "Manual entry only" },
];

const DEFAULT_SETTINGS: POSSettings = {
  defaultPrinterId: "star-micronics-bluetooth",
  defaultFormat: "80mm",
  barcodeReaderType: "usb",
  autoCashDrawer: true,
  autoPrintOnSale: true,
  courierStockAdjustmentOnly: false,
};

interface Branch {
  id: string;
  name: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const POSSettingsPage: React.FC = () => {
  const { fetchData: fetchBranchesData, loading: loadingBranches } = useFetch();
  const { fetchData: fetchSettingsData } = useFetch();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [settings, setSettings] = useState<POSSettings>(DEFAULT_SETTINGS);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Org-level POS defaults ─────────────────────────────────────────────────
  const {
    businessData,
    loading: loadingBusiness,
    loadBusinessProfile,
    updatePOSSettings,
  } = useBusinessProfile();
  const [orgAutoPrint, setOrgAutoPrint] = useState(true);
  const [orgAutoCashDrawer, setOrgAutoCashDrawer] = useState(true);
  const [orgSameBarcodeSameInventory, setOrgSameBarcodeSameInventory] =
    useState(false);
  const [orgCourierStockAdjustmentOnly, setOrgCourierStockAdjustmentOnly] =
    useState(false);
  const [orgCentralizedInventory, setOrgCentralizedInventory] =
    useState(false);
  const [orgCentralLocationId, setOrgCentralLocationId] = useState("");
  const [centralLocations, setCentralLocations] = useState<Branch[]>([]);
  const { fetchData: fetchAllLocationsData } = useFetch();
  const [orgStaffDiscountHidden, setOrgStaffDiscountHidden] = useState(false);
  const [orgCustomerDisplayEnabled, setOrgCustomerDisplayEnabled] =
    useState(false);
  const [orgDefaultDiscountType, setOrgDefaultDiscountType] = useState<
    "FIXED" | "PERCENTAGE"
  >("FIXED");
  const [orgDefaultDiscountValue, setOrgDefaultDiscountValue] = useState("");
  const [orgDefaultFormat, setOrgDefaultFormat] = useState<PaperFormat>("80mm");
  const [orgWhatsappLink, setOrgWhatsappLink] = useState("");
  const [orgStaffManagementEnabled, setOrgStaffManagementEnabled] = useState(true);
  const [orgSupplierOrdersEnabled, setOrgSupplierOrdersEnabled] = useState(true);
  // Warranty starts OFF, unlike the two above. An organization asks for it.
  const [orgWarrantyEnabled, setOrgWarrantyEnabled] = useState(false);
  const [orgWarrantyAutoGenerate, setOrgWarrantyAutoGenerate] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    loadBusinessProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (businessData) {
      setOrgAutoPrint(businessData.posAutoPrintOnSale ?? true);
      setOrgAutoCashDrawer(businessData.posAutoCashDrawer ?? true);
      setOrgSameBarcodeSameInventory(
        businessData.sameBarcodeSameInventory ?? false,
      );
      setOrgCourierStockAdjustmentOnly(
        businessData.courierStockAdjustmentOnly ?? false,
      );
      setOrgCentralizedInventory(
        businessData.centralizedInventoryEnabled ?? false,
      );
      setOrgCentralLocationId(businessData.centralInventoryLocationId ?? "");
      setOrgStaffDiscountHidden(businessData.posStaffDiscountHidden ?? false);
      setOrgCustomerDisplayEnabled(
        businessData.posCustomerDisplayEnabled ?? false,
      );
      setOrgDefaultDiscountType(
        businessData.posDefaultDiscountType ?? "FIXED",
      );
      setOrgDefaultDiscountValue(
        businessData.posDefaultDiscountValue != null
          ? String(businessData.posDefaultDiscountValue)
          : "",
      );
      setOrgDefaultFormat(
        (businessData.posDefaultFormat as PaperFormat) ?? "80mm",
      );
      setOrgWhatsappLink(businessData.whatsappGroupLink ?? "");
      setOrgStaffManagementEnabled(businessData.staffManagementEnabled ?? true);
      setOrgSupplierOrdersEnabled(businessData.supplierOrdersEnabled ?? true);
      setOrgWarrantyEnabled(businessData.warrantyEnabled ?? false);
      setOrgWarrantyAutoGenerate(businessData.warrantyAutoGenerate ?? true);
    }
  }, [businessData]);

  const handleSaveOrgDefaults = useCallback(async () => {
    if (orgCentralizedInventory && !orgCentralLocationId) {
      toast.error(
        "Select the central warehouse/location before enabling centralized inventory.",
      );
      return;
    }
    setSavingOrg(true);
    const result = await updatePOSSettings({
      posAutoPrintOnSale: orgAutoPrint,
      posAutoCashDrawer: orgAutoCashDrawer,
      sameBarcodeSameInventory: orgSameBarcodeSameInventory,
      courierStockAdjustmentOnly: orgCourierStockAdjustmentOnly,
      centralizedInventoryEnabled: orgCentralizedInventory,
      centralInventoryLocationId: orgCentralizedInventory
        ? orgCentralLocationId
        : undefined,
      posStaffDiscountHidden: orgStaffDiscountHidden,
      posCustomerDisplayEnabled: orgCustomerDisplayEnabled,
      posDefaultDiscountType: orgStaffDiscountHidden
        ? orgDefaultDiscountType
        : undefined,
      posDefaultDiscountValue: orgStaffDiscountHidden
        ? parseFloat(orgDefaultDiscountValue) || 0
        : undefined,
      posDefaultFormat: orgDefaultFormat,
      whatsappGroupLink: orgWhatsappLink || undefined,
      staffManagementEnabled: orgStaffManagementEnabled,
      supplierOrdersEnabled: orgSupplierOrdersEnabled,
      warrantyEnabled: orgWarrantyEnabled,
      warrantyAutoGenerate: orgWarrantyAutoGenerate,
    });
    setSavingOrg(false);
    if (result.success) {
      toast.success("Organization POS defaults saved!", { duration: 3000 });
    } else {
      toast.error(result.message || "Failed to save");
    }
  }, [
    orgAutoPrint,
    orgAutoCashDrawer,
    orgSameBarcodeSameInventory,
    orgCourierStockAdjustmentOnly,
    orgCentralizedInventory,
    orgCentralLocationId,
    orgStaffDiscountHidden,
    orgCustomerDisplayEnabled,
    orgDefaultDiscountType,
    orgDefaultDiscountValue,
    orgDefaultFormat,
    orgWhatsappLink,
    orgStaffManagementEnabled,
    orgSupplierOrdersEnabled,
    orgWarrantyEnabled,
    orgWarrantyAutoGenerate,
    updatePOSSettings,
  ]);

  // Fetch all branch locations for the business
  useEffect(() => {
    fetchBranchesData({
      endpoint: "/locations?branch=branch&limit=100",
      method: "GET",
      silent: true,
    }).then((res) => {
      const d = res?.data as { locations?: Branch[] } | Branch[] | null;
      const list: Branch[] = Array.isArray(d) ? d : (d?.locations ?? []);
      setBranches(list);
      if (list.length === 1) setSelectedLocationId(list[0].id);
    });
    // Load ALL locations (warehouses + branches) for the central-inventory picker
    fetchAllLocationsData({
      endpoint: "/locations?branch=all&limit=100",
      method: "GET",
      silent: true,
    }).then((res) => {
      const d = res?.data as { locations?: Branch[] } | Branch[] | null;
      const list: Branch[] = Array.isArray(d) ? d : (d?.locations ?? []);
      setCentralLocations(list);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load POS settings whenever selected branch changes
  useEffect(() => {
    if (!selectedLocationId) return;
    setLoadingSettings(true);
    fetchSettingsData({
      endpoint: `/locations/${selectedLocationId}/pos-settings`,
      method: "GET",
      silent: true,
    })
      .then((res) => {
        const d = res?.data as {
          defaultPrinterId?: string;
          defaultFormat?: string;
          barcodeReaderType?: string;
          autoCashDrawer?: boolean;
          autoPrintOnSale?: boolean;
        } | null;
        if (d) {
          setSettings({
            defaultPrinterId:
              d.defaultPrinterId ?? DEFAULT_SETTINGS.defaultPrinterId,
            defaultFormat:
              (d.defaultFormat as PaperFormat) ??
              DEFAULT_SETTINGS.defaultFormat,
            barcodeReaderType:
              (d.barcodeReaderType as BarcodeReaderType) ??
              DEFAULT_SETTINGS.barcodeReaderType,
            autoCashDrawer: d.autoCashDrawer ?? DEFAULT_SETTINGS.autoCashDrawer,
            autoPrintOnSale:
              d.autoPrintOnSale ?? DEFAULT_SETTINGS.autoPrintOnSale,
          });
        }
      })
      .finally(() => setLoadingSettings(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  const handleSave = useCallback(async () => {
    if (!selectedLocationId) {
      toast.error("Please select a branch first");
      return;
    }
    setSaving(true);
    const res = await fetchSettingsData({
      endpoint: `/locations/${selectedLocationId}/pos-settings`,
      method: "PUT",
      data: {
        defaultPrinterId: settings.defaultPrinterId,
        defaultFormat: settings.defaultFormat,
        barcodeReaderType: settings.barcodeReaderType,
        autoCashDrawer: settings.autoCashDrawer,
      },
      silent: true,
      showToastOnError: false,
    });
    setSaving(false);
    if (res?.success === true || res?.status === true) {
      toast.success("POS settings saved!", { duration: 3000 });
    } else {
      toast.error(res?.message || "Failed to save POS settings");
    }
  }, [selectedLocationId, settings, fetchSettingsData]);

  const handleReset = useCallback(async () => {
    if (!selectedLocationId) {
      toast.error("Please select a branch first");
      return;
    }
    setSaving(true);
    const res = await fetchSettingsData({
      endpoint: `/locations/${selectedLocationId}/pos-settings`,
      method: "PUT",
      data: {
        defaultPrinterId: DEFAULT_SETTINGS.defaultPrinterId,
        defaultFormat: DEFAULT_SETTINGS.defaultFormat,
        barcodeReaderType: DEFAULT_SETTINGS.barcodeReaderType,
        autoCashDrawer: DEFAULT_SETTINGS.autoCashDrawer,
        autoPrintOnSale: DEFAULT_SETTINGS.autoPrintOnSale,
      },
      silent: true,
      showToastOnError: false,
    });
    setSaving(false);
    if (res?.success === true || res?.status === true) {
      setSettings(DEFAULT_SETTINGS);
      toast.success("POS settings reset to defaults", { duration: 3000 });
    } else {
      toast.error(res?.message || "Failed to reset POS settings");
    }
  }, [selectedLocationId, fetchSettingsData]);

  const selectedDefaultPrinter =
    PRINTERS.find((p) => p.id === settings.defaultPrinterId) ?? PRINTERS[0];

  return (
    <div className="p-4 sm:p-6  mx-auto space-y-6 pb-10">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <div className="bg-orange-50 p-2.5 rounded-xl">
          <Settings2 className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            POS Default Settings
          </h1>
          <p className="text-sm text-gray-500">
            Configure your default printer, paper format and barcode reader.
            These defaults are applied automatically when opening Quick POS or
            normal POS.
          </p>
        </div>
      </div>

      {/* ── Organization-wide POS Defaults ── */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-[#1e3a8a]/20 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20 bg-blue-50/30">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Building2 className="w-5 h-5 text-[#1e3a8a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Organization-wide POS Behavior
            </h3>
            <p className="text-xs text-gray-500">
              These defaults apply to all branches across your organization.
            </p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5">
          {loadingBusiness ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {/* Auto-print toggle */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgAutoPrint}
                    onChange={(e) => setOrgAutoPrint(e.target.checked)}
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgAutoPrint ? "bg-[#1e3a8a]" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgAutoPrint ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Receipt
                    className={`w-4 h-4 ${orgAutoPrint ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgAutoPrint ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Auto-print receipt after sale
                    </p>
                    <p className="text-xs text-gray-500">
                      When enabled, a receipt is automatically printed right
                      after every completed sale.
                    </p>
                  </div>
                </div>
              </label>

              {/* Same barcode = same inventory toggle */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgSameBarcodeSameInventory}
                    onChange={(e) =>
                      setOrgSameBarcodeSameInventory(e.target.checked)
                    }
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgSameBarcodeSameInventory
                        ? "bg-[#1e3a8a]"
                        : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgSameBarcodeSameInventory
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <ScanLine
                    className={`w-4 h-4 ${orgSameBarcodeSameInventory ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgSameBarcodeSameInventory ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Same barcode, same inventory
                    </p>
                    <p className="text-xs text-gray-500">
                      Default is OFF. When ON, all products sharing a barcode
                      will always stay in sync for stock add, edit, and
                      adjustment at each location.
                    </p>
                  </div>
                </div>
              </label>

              {/* System-only courier stock adjustment toggle */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgCourierStockAdjustmentOnly}
                    onChange={(e) =>
                      setOrgCourierStockAdjustmentOnly(e.target.checked)
                    }
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgCourierStockAdjustmentOnly
                        ? "bg-[#1e3a8a]"
                        : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgCourierStockAdjustmentOnly
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Truck
                    className={`w-4 h-4 ${orgCourierStockAdjustmentOnly ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgCourierStockAdjustmentOnly ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Courier stock adjustment only
                    </p>
                    <p className="text-xs text-gray-500">
                      Default is OFF. When ON, Quick POS can create system-only
                      courier records and adjust stock without collecting
                      receiver details. API-enabled courier services still
                      require receiver details.
                    </p>
                  </div>
                </div>
              </label>

              {/* Centralized inventory (shared central warehouse stock) */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgCentralizedInventory}
                    onChange={(e) =>
                      setOrgCentralizedInventory(e.target.checked)
                    }
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgCentralizedInventory ? "bg-[#1e3a8a]" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgCentralizedInventory
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Building2
                    className={`w-4 h-4 ${orgCentralizedInventory ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgCentralizedInventory ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Centralized inventory (single warehouse)
                    </p>
                    <p className="text-xs text-gray-500">
                      Default is OFF. When ON, all branches share ONE central
                      stock pool   you don't assign stock to branches. Every
                      branch sale reads from and deducts the selected
                      warehouse's inventory. Sales still report under each
                      branch.
                    </p>
                  </div>
                </div>
              </label>

              {/* Central warehouse/location picker (only when centralized is ON) */}
              {orgCentralizedInventory && (
                <div className="ml-16 -mt-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Central inventory location
                  </label>
                  <select
                    value={orgCentralLocationId}
                    onChange={(e) => setOrgCentralLocationId(e.target.value)}
                    className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                  >
                    <option value="">  Select warehouse / location  </option>
                    {centralLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Typically your main warehouse. All branches will use this
                    location's stock.
                  </p>
                </div>
              )}

              {/* Staff discount control */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgStaffDiscountHidden}
                    onChange={(e) => setOrgStaffDiscountHidden(e.target.checked)}
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgStaffDiscountHidden ? "bg-[#1e3a8a]" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgStaffDiscountHidden ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-sm font-semibold ${orgStaffDiscountHidden ? "text-[#1e3a8a]" : "text-gray-700"}`}
                  >
                    Hide discount editing from staff
                  </p>
                  <p className="text-xs text-gray-500">
                    When enabled, staff cannot change discounts in Quick POS or
                    POS. The default discount below is applied automatically.
                  </p>
                </div>
              </label>

              {orgStaffDiscountHidden && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-16">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Default discount type
                    </label>
                    <select
                      value={orgDefaultDiscountType}
                      onChange={(e) =>
                        setOrgDefaultDiscountType(
                          e.target.value as "FIXED" | "PERCENTAGE",
                        )
                      }
                      className="w-full px-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                    >
                      <option value="FIXED">Fixed amount (LKR)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Default discount value
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={orgDefaultDiscountValue}
                      onChange={(e) => setOrgDefaultDiscountValue(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                    />
                  </div>
                </div>
              )}

              {/* Customer-facing second display */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgCustomerDisplayEnabled}
                    onChange={(e) =>
                      setOrgCustomerDisplayEnabled(e.target.checked)
                    }
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgCustomerDisplayEnabled
                        ? "bg-[#1e3a8a]"
                        : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgCustomerDisplayEnabled
                        ? "translate-x-6"
                        : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Monitor
                    className={`w-4 h-4 ${orgCustomerDisplayEnabled ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgCustomerDisplayEnabled ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Customer display screen
                    </p>
                    <p className="text-xs text-gray-500">
                      Default is OFF. When ON, Quick POS can open a second screen
                      for the customer showing selected products, quantities, and
                      totals only.
                    </p>
                  </div>
                </div>
              </label>

              {/* Default paper format */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Default Paper Format
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Used for auto-print when a branch hasn't configured its own
                  format.
                </p>
                <div className="flex gap-2 flex-wrap">
                  {PAPER_FORMATS.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setOrgDefaultFormat(fmt.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                        orgDefaultFormat === fmt.id
                          ? "bg-[#1e3a8a] text-white border-[#1e3a8a]"
                          : "bg-white/40 backdrop-blur-sm text-gray-700 border-white/40 hover:border-[#1e3a8a]/40"
                      }`}
                    >
                      <span>{fmt.icon}</span>
                      <span>{fmt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-cashier / cash drawer toggle */}
              <label className="flex items-center gap-4 cursor-pointer select-none">
                <div className="relative shrink-0">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={orgAutoCashDrawer}
                    onChange={(e) => setOrgAutoCashDrawer(e.target.checked)}
                  />
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      orgAutoCashDrawer ? "bg-[#1e3a8a]" : "bg-gray-300"
                    }`}
                  />
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      orgAutoCashDrawer ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Wallet
                    className={`w-4 h-4 ${orgAutoCashDrawer ? "text-[#1e3a8a]" : "text-gray-400"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${orgAutoCashDrawer ? "text-[#1e3a8a]" : "text-gray-700"}`}
                    >
                      Auto cash-drawer (cashier prompt)
                    </p>
                    <p className="text-xs text-gray-500">
                      When enabled, cashiers are prompted to open the cash
                      drawer after every cash sale.
                    </p>
                  </div>
                </div>
              </label>

              {/* WhatsApp Group Link */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  WhatsApp Group Link
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Paste your WhatsApp invite link here. A QR code will be
                  printed at the bottom of every receipt.
                </p>
                <input
                  type="url"
                  value={orgWhatsappLink}
                  onChange={(e) => setOrgWhatsappLink(e.target.value)}
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full px-3 py-2 text-sm border border-white/40 rounded-xl bg-white/30 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
                />
              </div>

              <div className="rounded-xl border border-white/40 bg-white/20 p-4 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Organization Features</p>
                <p className="text-xs text-gray-500">
                  Enable modules for this organization. Users still need the correct permissions to access them.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orgStaffManagementEnabled}
                    onChange={(e) => setOrgStaffManagementEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800">Staff Management</span>
                    <p className="text-xs text-gray-500">Allow creating and managing staff members.</p>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orgSupplierOrdersEnabled}
                    onChange={(e) => setOrgSupplierOrdersEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800">Supplier Orders</span>
                    <p className="text-xs text-gray-500">Allow suppliers, purchase orders, and goods receipts.</p>
                  </span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={orgWarrantyEnabled}
                    onChange={(e) => setOrgWarrantyEnabled(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    <span className="text-sm font-medium text-gray-800">Warranty</span>
                    <p className="text-xs text-gray-500">
                      Show the warranty pages and allow warranty cards and claims.
                      Turning this off only hides the feature   existing warranty
                      cards are kept and come back if you switch it on again.
                    </p>
                  </span>
                </label>
                {orgWarrantyEnabled && (
                  <label className="flex items-start gap-3 cursor-pointer pl-7">
                    <input
                      type="checkbox"
                      checked={orgWarrantyAutoGenerate}
                      onChange={(e) => setOrgWarrantyAutoGenerate(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="text-sm font-medium text-gray-800">
                        Create warranty cards automatically
                      </span>
                      <p className="text-xs text-gray-500">
                        When a product that has warranty months is sold, issue its
                        warranty card straight away, linked to that sale. Products
                        with no warranty period are never affected. Turn this off to
                        create warranty cards by hand instead.
                      </p>
                    </span>
                  </label>
                )}
              </div>

              <button
                onClick={handleSaveOrgDefaults}
                disabled={savingOrg}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {savingOrg ? "Saving…" : "Save Organization Defaults"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Branch Selector ── */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm p-5">
        <label className="block text-sm font-semibold text-gray-800 mb-2">
          Select Branch
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Choose which branch you want to configure POS settings for.
        </p>
        <div className="relative">
          {loadingBranches ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading branches…
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full sm:w-80 appearance-none bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              >
                <option value="">  Select a branch  </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Show settings only when a branch is selected */}
      {!selectedLocationId ? (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 text-center">
          <Settings2 className="w-10 h-10 text-orange-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-orange-700">
            Select a branch above to view and configure its POS settings.
          </p>
        </div>
      ) : loadingSettings ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading settings…</span>
        </div>
      ) : (
        <>
          {/* ── Section 1: Default Printer ── */}
          <SectionCard
            icon={<Printer className="w-5 h-5 text-orange-600" />}
            title="Default Printer"
            subtitle="Select the printer model used at this workstation"
            iconBg="bg-orange-50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRINTERS.map((p) => {
                const isSelected = settings.defaultPrinterId === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        defaultPrinterId: p.id,
                        defaultFormat: p.supportedFormats.includes(
                          s.defaultFormat,
                        )
                          ? s.defaultFormat
                          : p.defaultFormat,
                      }))
                    }
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50"
                        : "border-white/40 hover:border-orange-300 hover:bg-orange-50/30"
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
                          {p.name}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.badgeColor}`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Section 2: Default Paper Format ── */}
          <SectionCard
            icon={<span className="text-lg">📄</span>}
            title="Default Paper Format"
            subtitle="Receipt size used when printing from POS"
            iconBg="bg-yellow-50"
          >
            <div className="flex gap-3 flex-wrap">
              {PAPER_FORMATS.map((f) => {
                const available =
                  selectedDefaultPrinter.supportedFormats.includes(f.id);
                const isSelected = settings.defaultFormat === f.id;
                return (
                  <button
                    key={f.id}
                    disabled={!available}
                    onClick={() =>
                      available &&
                      setSettings((s) => ({ ...s, defaultFormat: f.id }))
                    }
                    className={`flex-1 min-w-32.5 flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border-2 transition-all ${
                      !available
                        ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                        : isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-white/40 hover:border-orange-300 hover:bg-orange-50/30 cursor-pointer"
                    }`}
                  >
                    <span className="text-2xl">{f.icon}</span>
                    <span
                      className={`text-sm font-bold ${isSelected ? "text-orange-700" : "text-gray-700"}`}
                    >
                      {f.label}
                    </span>
                    <span className="text-xs text-gray-500 text-center leading-tight">
                      {f.detail}
                    </span>
                    {isSelected && (
                      <CheckCircle className="w-4 h-4 text-orange-500 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Paper choices are limited to formats supported by{" "}
              {selectedDefaultPrinter.name}.
            </p>
          </SectionCard>

          {/* ── Section 3: Barcode Reader ── */}
          <SectionCard
            icon={<ScanLine className="w-5 h-5 text-green-600" />}
            title="Barcode Reader Type"
            subtitle="How barcodes are typically scanned at this workstation"
            iconBg="bg-green-50"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {BARCODE_READERS.map((r) => {
                const isSelected = settings.barcodeReaderType === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() =>
                      setSettings((s) => ({ ...s, barcodeReaderType: r.id }))
                    }
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-orange-500 bg-orange-50"
                        : "border-white/40 hover:border-orange-300 hover:bg-orange-50/30"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "border-orange-500 bg-orange-500"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </div>
                    <span className="text-xl leading-none">{r.icon}</span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${isSelected ? "text-orange-700" : "text-gray-800"}`}
                      >
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-500">{r.detail}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Section 4: Cash Drawer ── */}
          <SectionCard
            icon={<Wallet className="w-5 h-5 text-orange-600" />}
            title="Auto Cash Drawer"
            subtitle="Show a cash-drawer opening notification after every cash sale"
            iconBg="bg-orange-50"
          >
            <label className="flex items-center gap-4 cursor-pointer select-none">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={settings.autoCashDrawer}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      autoCashDrawer: e.target.checked,
                    }))
                  }
                />
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.autoCashDrawer ? "bg-orange-500" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    settings.autoCashDrawer ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <p
                  className={`text-sm font-semibold ${settings.autoCashDrawer ? "text-orange-700" : "text-gray-700"}`}
                >
                  {settings.autoCashDrawer ? "Enabled" : "Disabled"}
                </p>
                <p className="text-xs text-gray-500">
                  When enabled, a blue overlay reminds cashiers to open the cash
                  drawer after a cash sale.
                </p>
              </div>
            </label>
          </SectionCard>

          {/* ── Section: QZ Tray Direct Printer (ESC/POS) ── */}
          <PrinterSettings locationId={selectedLocationId} />

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Settings"}
            </button>
            <button
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/40 hover:bg-white/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── Helper Card ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  icon,
  title,
  subtitle,
  iconBg,
  children,
}) => (
  <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/30 shadow-sm overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-4 border-b border-white/20">
      <div className={`${iconBg} p-2 rounded-lg`}>{icon}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

export default POSSettingsPage;
