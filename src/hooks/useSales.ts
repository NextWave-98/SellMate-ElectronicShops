/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback } from "react";
import useFetch from "./useFetch";
import {
  DEFAULT_PRINTER_CONFIG,
  type PrinterConfig,
} from "@/lib/printerConfig";
import {
  isIOSDevice,
  isMobilePOSDevice,
  printHtmlInNewTab,
  showAirPrintFallbackHint,
  tryStarMobilePrint,
} from "@/lib/starPrint";

// Types
export interface SalesDashboardData {
  summary: {
    totalSales: number;
    totalRevenue: number;
    totalPaid: number;
    totalOutstanding: number;
    avgOrderValue: number;
    profitMargin: number;
  };
  trends: TrendPoint[];
  topLocations: LocationPerformance[]; // Changed from topBranches
  topStaff: StaffPerformance[];
  topProducts: ProductPerformance[];
  paymentMethodBreakdown: PaymentMethodData[];
  recentSales: RecentSale[];
  growth: GrowthIndicators;
}

export interface TrendPoint {
  date: string;
  salesCount: number;
  revenue: number;
  avgOrderValue: number;
}

export interface LocationPerformance {
  locationId: string; // Changed from branchId
  locationName: string; // Changed from branchName
  salesCount: number;
  revenue: number;
  growth: number;
}

// Backward compatibility alias
export type BranchPerformance = LocationPerformance;

export interface StaffPerformance {
  staffId: string;
  staffName: string;
  salesCount: number;
  revenue: number;
  commission: number;
}

export interface ProductPerformance {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  profit: number;
}

export interface PaymentMethodData {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface RecentSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string;
  locationName: string; // Changed from branchName
}

export interface GrowthIndicators {
  salesGrowth: number;
  revenueGrowth: number;
  aovGrowth: number;
  profitGrowth: number;
}

export interface SalesFilters {
  startDate?: string;
  endDate?: string;
  locationId?: string; // Changed from branchId
  period?: "today" | "yesterday" | "week" | "month" | "year" | "custom";
}

export interface RevenueAnalytics {
  total: number;
  paid: number;
  outstanding: number;
  byPaymentMethod: PaymentMethodData[];
  byBranch: BranchRevenue[];
  byPeriod: PeriodRevenue[];
}

export interface LocationRevenue {
  locationId: string; // Changed from branchId
  locationName: string; // Changed from branchName
  revenue: number;
  percentage: number;
}

// Backward compatibility alias
export type BranchRevenue = LocationRevenue;

export interface PeriodRevenue {
  period: string;
  revenue: number;
  salesCount: number;
}

const useSales = () => {
  const dashboardFetch = useFetch();
  const statsFetch = useFetch();
  const revenueFetch = useFetch();
  const trendsFetch = useFetch();
  const branchFetch = useFetch();
  const staffFetch = useFetch();
  const productFetch = useFetch();
  const topCustomersFetch = useFetch();
  const profitFetch = useFetch();
  const paymentMethodsFetch = useFetch();
  const posFetch = useFetch();
  const pendingFetch = useFetch();
  const bulkFetch = useFetch();

  // Get dashboard data (comprehensive aggregated data)
  const getDashboardData = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId); // Changed from branchId
      if (filters?.period) queryParams.append("period", filters.period);

      return dashboardFetch.fetchData({
        endpoint: `/sales/dashboard?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [dashboardFetch],
  );

  // Get branch dashboard data (for branch managers)
  const getBranchDashboard = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.period) queryParams.append("period", filters.period);

      return dashboardFetch.fetchData({
        endpoint: `/sales/branch/dashboard?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [dashboardFetch],
  );

  // Get enhanced branch dashboard with jobsheet/POS breakdown
  const getBranchEnhancedDashboard = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.period) queryParams.append("period", filters.period);

      const query = queryParams.toString();
      return dashboardFetch.fetchData({
        endpoint: query
          ? `/sales/branch/enhanced-dashboard?${query}`
          : "/sales/branch/enhanced-dashboard?period=month",
        method: "GET",
        silent: true,
      });
    },
    [dashboardFetch],
  );

  // Get sales statistics
  const getSalesStats = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);

      return statsFetch.fetchData({
        endpoint: `/sales/overview?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [statsFetch],
  );

  // Get revenue analytics
  const getRevenueAnalytics = useCallback(
    async (period: string = "month") => {
      return revenueFetch.fetchData({
        endpoint: `/sales/revenue-breakdown?period=${period}`,
        method: "GET",
        silent: true,
      });
    },
    [revenueFetch],
  );

  // Get sales trends
  const getSalesTrends = useCallback(
    async (
      startDate: string,
      endDate: string,
      groupBy: "day" | "week" | "month" = "day",
    ) => {
      return trendsFetch.fetchData({
        endpoint: `/sales/trends?startDate=${startDate}&endDate=${endDate}&groupBy=${groupBy}`,
        method: "GET",
        silent: true,
      });
    },
    [trendsFetch],
  );

  // Get sales by branch
  const getSalesByBranch = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);

      return branchFetch.fetchData({
        endpoint: `/sales/branch-performance?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [branchFetch],
  );

  // Get sales by staff
  const getSalesByStaff = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);

      return staffFetch.fetchData({
        endpoint: `/sales/staff-performance?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [staffFetch],
  );

  // Get sales by product
  const getSalesByProduct = useCallback(
    async (filters?: SalesFilters & { limit?: number }) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());

      return productFetch.fetchData({
        endpoint: `/sales/top-products?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [productFetch],
  );

  // Get top customers
  const getTopCustomers = useCallback(
    async (limit: number = 10, filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      queryParams.append("limit", limit.toString());
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);

      return topCustomersFetch.fetchData({
        endpoint: `/sales/top-customers?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [topCustomersFetch],
  );

  // Get profit analysis
  const getProfitAnalysis = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);

      return profitFetch.fetchData({
        endpoint: `/sales/profit-analysis?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [profitFetch],
  );

  // Get payment method breakdown
  const getPaymentMethodBreakdown = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);

      return paymentMethodsFetch.fetchData({
        endpoint: `/sales/payment-methods?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [paymentMethodsFetch],
  );

  // Get customer insights
  const getCustomerInsights = useCallback(
    async (filters?: SalesFilters) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);

      return topCustomersFetch.fetchData({
        endpoint: `/sales/customer-insights?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [topCustomersFetch],
  );

  // Get sales details with pagination
  const getSalesDetails = useCallback(
    async (
      filters?: SalesFilters & {
        page?: number;
        limit?: number;
        staffId?: string;
        status?: string;
      },
    ) => {
      const queryParams = new URLSearchParams();
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);
      if (filters?.staffId) queryParams.append("staffId", filters.staffId);
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.page) queryParams.append("page", filters.page.toString());
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());

      return dashboardFetch.fetchData({
        endpoint: `/sales/details?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [dashboardFetch],
  );

  // ============================================
  // POS OPERATIONS
  // ============================================

  // Create a new sale (POS)
  const createSale = useCallback(
    async (saleData: {
      locationId: string; // Changed from branchId
      soldById: string;
      customerId?: string;
      items: Array<{
        productId: string;
        quantity: number;
        unitPrice: number;
        costPrice?: number;
        discount?: number;
        discountType?: "PERCENTAGE" | "FIXED";
        tax?: number;
        warrantyMonths?: number;
        reloadPhone?: string;
      }>;
      payments?: Array<{
        method:
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "CHEQUE"
          | "MOBILE_MONEY"
          | "KOKO"
          | "MINTPAY"
          | "PAYZY";
        amount: number;
        reference?: string;
      }>;
      type: "DIRECT_SALE" | "INVOICE_SALE" | "QUOTE";
      discount?: number;
      discountType?: "PERCENTAGE" | "FIXED";
      notes?: string;
    }) => {
      return posFetch.fetchData({
        endpoint: "/sales/pos",
        method: "POST",
        data: saleData,
      });
    },
    [posFetch],
  );

  const downloadInvoice = useCallback(
    async (
      saleId: string,
      options: {
        format?: "a4" | "80mm" | "58mm";
        includeTerms?: boolean;
        includeConditions?: boolean;
      } = {},
    ) => {
      try {
        const format = options.format ?? "a4";
        const queryParams = new URLSearchParams({ format });

        const result = await posFetch.fetchData({
          method: "GET",
          endpoint: `/sales/pos/${saleId}/invoice/download?${queryParams.toString()}`,
          responseType: "blob",
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error("Failed to download invoice");
        }

        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          format !== "a4"
            ? `receipt_${format}_${saleId}.pdf`
            : `invoice_${saleId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading invoice:", error);
        throw error;
      }
    },
    [posFetch],
  );

  const downloadAcknowledgement = useCallback(
    async (saleId: string, format: "a4" | "80mm" | "58mm" = "80mm") => {
      try {
        const queryParams = new URLSearchParams({ format });
        const result = await posFetch.fetchData({
          method: "GET",
          endpoint: `/sales/pos/${saleId}/acknowledgement?${queryParams.toString()}`,
          responseType: "blob",
          silent: true,
        });
        if (!result || !(result instanceof Blob)) {
          throw new Error("Failed to download acknowledgement");
        }
        const blob = result as Blob;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `acknowledgement_${format}_${saleId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading acknowledgement:", error);
        throw error;
      }
    },
    [posFetch],
  );

  const printAcknowledgement = useCallback(
    async (saleId: string, format: "a4" | "80mm" | "58mm" = "80mm") => {
      try {
        const queryParams = new URLSearchParams({ format });
        const result = await posFetch.fetchData({
          method: "GET",
          endpoint: `/sales/pos/${saleId}/acknowledgement?${queryParams.toString()}`,
          responseType: "blob",
          silent: true,
        });
        if (!result || !(result instanceof Blob)) {
          throw new Error("Failed to generate acknowledgement");
        }

        const blob = new Blob([result as Blob], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank");

        if (printWindow) {
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch {
              /* window may have been closed by user */
            }
            setTimeout(() => window.URL.revokeObjectURL(url), 8000);
          }, 1500);
        } else {
          const link = document.createElement("a");
          link.href = url;
          link.download = `acknowledgement_${format}_${saleId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error("Error printing acknowledgement:", error);
        throw error;
      }
    },
    [posFetch],
  );

  const getAdvanceSales = useCallback(
    async (locationId?: string, page = 1, limit = 20, search?: string) => {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        channel: "POS",
      });
      if (locationId) queryParams.set("locationId", locationId);
      if (search) queryParams.set("search", search);
      return posFetch.fetchData({
        method: "GET",
        endpoint: `/sales/pos/pending-payments?${queryParams.toString()}`,
        silent: true,
      });
    },
    [posFetch],
  );

  const printInvoice = useCallback(
    async (
      saleId: string,
      options: { format?: "a4" | "80mm" | "58mm"; copies?: number } = {},
    ) => {
      try {
        const format = options.format ?? "a4";
        const queryParams = new URLSearchParams({ format });

        const result = await posFetch.fetchData({
          method: "GET",
          endpoint: `/sales/pos/${saleId}/invoice/print?${queryParams.toString()}`,
          responseType: "blob",
          silent: true,
        });

        if (!result || !(result instanceof Blob)) {
          throw new Error("Failed to generate invoice for printing");
        }

        // Force application/pdf so Edge/Chrome render it in the PDF viewer
        const blob = new Blob([result as Blob], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const printWindow = window.open(url, "_blank");

        if (printWindow) {
          // PDF viewer does NOT fire the window 'load' event in Chrome/Edge.
          // Use a fixed delay so the PDF has time to render before print() is called.
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch {
              /* window may have been closed by user */
            }
            setTimeout(() => window.URL.revokeObjectURL(url), 8000);
          }, 1500);
        } else {
          // Popup blocked → fall back to download
          const link = document.createElement("a");
          link.href = url;
          link.download =
            format !== "a4"
              ? `receipt_${format}_${saleId}.pdf`
              : `invoice_${saleId}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
      } catch (error) {
        console.error("Error printing invoice:", error);
        throw error;
      }
    },
    [posFetch],
  );

  /**
   * Auto-print via browser using window.open() + print().
   * Chrome supports PDF printing this way (the built-in PDF viewer responds to
   * window.print()). For completely silent printing with no dialog, launch
   * Chrome with the --kiosk-printing flag, OR use QZ Tray (preferred).
   *
   * NOTE: An <iframe> approach does NOT work for PDFs in Chrome — the PDF plugin
   * blocks iframe.contentWindow.print() and triggers a download instead.
   */
  /**
   * Print a sale receipt silently to the default printer by injecting the
   * backend-rendered HTML into a hidden iframe in the current page.
   *
   * HOW IT WORKS
   * ─────────────
   * 1. Fetch `GET /sales/pos/:id/invoice/html?format=...` (returns HTML text).
   * 2. Create a 1×1-px invisible <iframe> appended to document.body.
   * 3. Write the HTML into the iframe document (iframeDoc.write(html)).
   * 4. The HTML itself contains <script>window.print()</script> which runs in
   *    the iframe's own JS context — this is NOT treated as a popup and is
   *    never blocked by Chrome/Edge popup blocker.
   * 5. The OS print dialog appears targeting the DEFAULT system printer (e.g.
   *    Xprinter XP-365B).  With --kiosk-printing Chrome flag, no dialog shown.
   * 6. No new window is opened on the parent page at any point.
   *
   * All failure paths are reported via console.error with an [AutoPrint] prefix.
   */
  const fetchInvoiceHtml = useCallback(
    async (
      saleId: string,
      format: "a4" | "80mm" | "58mm",
      cashReceived?: number,
    ): Promise<string | null> => {
      const cashParam =
        cashReceived && cashReceived > 0 ? `&cashReceived=${cashReceived}` : "";
      try {
        const result = await posFetch.fetchData({
          method: "GET",
          endpoint: `/sales/pos/${saleId}/invoice/html?format=${format}${cashParam}`,
          responseType: "blob",
          silent: true,
        });
        if (!result || !(result instanceof Blob)) return null;
        const html = await (result as Blob).text();
        if (!html?.includes("<html")) return null;
        return html;
      } catch {
        return null;
      }
    },
    [posFetch],
  );

  const silentPrintInvoice = useCallback(
    async (
      saleId: string,
      options: {
        format?: "a4" | "80mm" | "58mm";
        cashReceived?: number;
        printerConf?: PrinterConfig | null;
        openDrawer?: boolean;
      } = {},
    ): Promise<void> => {
      const printerConf =
        options.printerConf ??
        (isMobilePOSDevice() ? { ...DEFAULT_PRINTER_CONFIG } : null);
      const format =
        options.format ??
        (printerConf?.paperWidth === "58mm" || printerConf?.paperWidth === "80mm"
          ? printerConf.paperWidth
          : "58mm");
      console.log(
        `[AutoPrint] saleId=${saleId}, format=${format}, mobile=${isMobilePOSDevice()}`,
      );

      // ── Mobile Star path (WebPRNT / PassPRNT) — desktop unchanged ─────────
      if (printerConf && isMobilePOSDevice()) {
        let commands: number[] | undefined;
        const paperWidth =
          format === "58mm" ? "58mm" : format === "80mm" ? "80mm" : printerConf.paperWidth;
        if (paperWidth === "58mm" || paperWidth === "80mm") {
          try {
            const escposRes = await posFetch.fetchData({
              method: "GET",
              endpoint: `/sales/pos/${saleId}/escpos?paperWidth=${paperWidth}`,
              silent: true,
            });
            const escposData = (escposRes as any)?.data;
            if (escposData?.commands?.length) {
              commands = escposData.commands;
            }
          } catch {
            console.error("[AutoPrint] ESC/POS fetch failed for Star mobile print");
          }
        }

        const htmlForPass =
          (await fetchInvoiceHtml(saleId, format, options.cashReceived)) ?? undefined;
        const starPrinted = await tryStarMobilePrint({
          printerConf,
          commands,
          html: htmlForPass,
          openDrawer: options.openDrawer,
        });
        if (starPrinted) return;
      }

      // ── Fetch HTML for browser print fallback ─────────────────────────────
      const html = await fetchInvoiceHtml(saleId, format, options.cashReceived);
      if (!html) {
        console.error("[AutoPrint] Failed: could not fetch HTML receipt");
        return;
      }
      console.log("[AutoPrint] HTML receipt fetched successfully");

      // ── iPad/iPhone: new tab (iframe print blocked by Safari) ─────────────
      if (isIOSDevice()) {
        printHtmlInNewTab(html);
        if (
          printerConf &&
          (printerConf.mobilePrintMode ?? "auto") !== "passprnt" &&
          !printerConf.starWebPrntHost?.trim()
        ) {
          showAirPrintFallbackHint();
        }
        return;
      }

      // ── Desktop / Android: hidden iframe (unchanged) ──────────────────────
      const iframe = document.createElement("iframe");
      iframe.id = `auto-print-frame-${Date.now()}`;
      const paperWidthCss =
        format === "80mm" ? "80mm" : format === "58mm" ? "58mm" : "210mm";
      iframe.setAttribute("data-print-format", format);
      iframe.style.cssText = `position:fixed;width:${paperWidthCss};height:1px;top:-9999px;left:-9999px;border:none;opacity:0;`;
      document.body.appendChild(iframe);

      try {
        const iframeDoc =
          iframe.contentDocument ??
          (iframe.contentWindow as Window | null)?.document;
        if (!iframeDoc) {
          document.body.removeChild(iframe);
          return;
        }
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
      } catch (err) {
        console.error("[AutoPrint] Failed: Error writing HTML to iframe:", err);
        document.body.removeChild(iframe);
        return;
      }

      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {
          /* already removed */
        }
      }, 30_000);
    },
    [posFetch, fetchInvoiceHtml],
  );

  // Get all sales (with filters)
  const getSales = useCallback(
    async (filters?: {
      branchId?: string;
      locationId?: string;
      customerId?: string;
      status?:
        | "PENDING"
        | "COMPLETED"
        | "PARTIAL_REFUND"
        | "REFUNDED"
        | "CANCELLED";
      type?: "DIRECT_SALE" | "INVOICE_SALE" | "QUOTE";
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) => {
      const queryParams = new URLSearchParams();
      if (filters?.locationId)
        queryParams.append("locationId", filters.locationId);
      if (filters?.customerId)
        queryParams.append("customerId", filters.customerId);
      if (filters?.status) queryParams.append("status", filters.status);
      if (filters?.type) queryParams.append("type", filters.type);
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate);
      if (filters?.endDate) queryParams.append("endDate", filters.endDate);
      if (filters?.page) queryParams.append("page", filters.page.toString());
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());

      return posFetch.fetchData({
        endpoint: `/sales/pos?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [posFetch],
  );

  // Get sale by ID (works for both POS sales and JobSheets)
  const getSaleById = useCallback(
    async (id: string) => {
      return posFetch.fetchData({
        endpoint: `/sales/${id}`,
        method: "GET",
        silent: true,
      });
    },
    [posFetch],
  );

  // Add payment to sale
  const addPaymentToSale = useCallback(
    async (
      saleId: string,
      paymentData: {
        method?:
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "CHEQUE"
          | "MOBILE_MONEY"
          | "KOKO"
          | "MINTPAY"
          | "PAYZY";
        paymentMethod?:
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "CHEQUE"
          | "MOBILE_MONEY"
          | "KOKO"
          | "MINTPAY"
          | "PAYZY";
        amount: number;
        reference?: string;
        receivedById?: string;
      },
    ) => {
      // Normalize aliases from frontend (method -> paymentMethod)
      const payload: any = {
        amount: paymentData.amount,
        reference: paymentData.reference,
      } as any;

      payload.paymentMethod =
        paymentData.paymentMethod ||
        (paymentData as any).method ||
        (paymentData as any).payment_method;
      if (paymentData.receivedById)
        payload.receivedById = paymentData.receivedById;

      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/payments`,
        method: "POST",
        data: payload,
      });
    },
    [posFetch],
  );

  // Payment history for a sale (advance-payment history drawer)
  const getSalePayments = useCallback(
    (saleId: string) =>
      posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/payments`,
        method: "GET",
      }),
    [posFetch],
  );

  // Create refund
  const createRefund = useCallback(
    async (
      saleId: string,
      refundData: {
        amount: number;
        reason: string;
        refundMethod?:
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "CHEQUE"
          | "MOBILE_MONEY";
        method?: "CASH" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "MOBILE_MONEY";
        processedById?: string;
        items?: Array<{
          productId: string;
          quantity: number;
        }>;
      },
    ) => {
      // Normalize alias method -> refundMethod
      const payload: any = {
        amount: refundData.amount,
        reason: refundData.reason,
        items: refundData.items,
      };

      payload.refundMethod =
        refundData.refundMethod ||
        refundData.method ||
        (refundData as any).refund_method;
      if (refundData.processedById)
        payload.processedById = refundData.processedById;

      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/refunds`,
        method: "POST",
        data: payload,
      });
    },
    [posFetch],
  );

  // Delete sale (hard delete with full cascade)
  const deleteSale = useCallback(
    async (saleId: string) => {
      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}`,
        method: "DELETE",
      });
    },
    [posFetch],
  );

  // Cancel sale
  const cancelSale = useCallback(
    async (saleId: string, reason: string) => {
      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/cancel`,
        method: "POST",
        data: { reason },
      });
    },
    [posFetch],
  );

  // Complete a pending/partial sale payment (updates existing PENDING SalePayment instead of creating a new one)
  const completePendingPayment = useCallback(
    async (
      saleId: string,
      paymentData: {
        paymentMethod:
          | "CASH"
          | "CARD"
          | "BANK_TRANSFER"
          | "CHEQUE"
          | "MOBILE_MONEY"
          | "KOKO"
          | "MINTPAY"
          | "PAYZY";
        amount: number;
        reference?: string;
        receivedById?: string;
      },
    ) => {
      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/complete-payment`,
        method: "POST",
        data: paymentData,
      });
    },
    [posFetch],
  );

  // Get pending / partial sales
  const getPendingSales = useCallback(
    async (filters?: {
      page?: number;
      limit?: number;
      search?: string;
      paymentMethod?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const queryParams = new URLSearchParams();
      queryParams.append("paymentStatus", "PENDING,PARTIAL");
      if (filters?.page) queryParams.append("page", filters.page.toString());
      if (filters?.limit) queryParams.append("limit", filters.limit.toString());
      if (filters?.search)
        queryParams.append("search", filters.search.toString());
      if (filters?.paymentMethod)
        queryParams.append("paymentMethod", filters.paymentMethod.toString());
      if (filters?.status)
        queryParams.append("status", filters.status.toString());
      if (filters?.startDate)
        queryParams.append("startDate", filters.startDate.toString());
      if (filters?.endDate)
        queryParams.append("endDate", filters.endDate.toString());

      return pendingFetch.fetchData({
        endpoint: `/sales/pos?${queryParams.toString()}`,
        method: "GET",
        silent: true,
      });
    },
    [pendingFetch],
  );

  /**
   * Bulk complete payments for multiple sales.
   * Marks each payment COMPLETED, updates sale status → COMPLETED when fully paid,
   * and (if a courier shipment is linked) marks it DELIVERED.
   */
  const bulkCompletePayments = useCallback(
    async (
      items: Array<{
        saleId: string;
        amount: number;
        paymentMethod?: string;
        referenceNumber?: string;
        notes?: string;
      }>,
    ) => {
      return bulkFetch.fetchData({
        endpoint: "/sales/pos/bulk-complete-payments",
        method: "POST",
        data: { items },
      });
    },
    [bulkFetch],
  );

  /**
   * Fetch raw ESC/POS byte commands for a sale (used by QZ Tray direct printing).
   * Returns `{ commands: number[], printerType: 'thermal' }` inside `data`.
   */
  const getESCPOSData = useCallback(
    async (saleId: string, paperWidth: "58mm" | "80mm" = "80mm") => {
      return posFetch.fetchData({
        endpoint: `/sales/pos/${saleId}/escpos?paperWidth=${paperWidth}`,
        method: "GET",
        silent: true,
      });
    },
    [posFetch],
  );

  return {
    // Dashboard & Analytics
    getDashboardData,
    getBranchDashboard,
    getBranchEnhancedDashboard,
    getSalesStats,
    getRevenueAnalytics,
    getSalesTrends,
    getSalesByBranch,
    getSalesByStaff,
    getSalesByProduct,
    getTopCustomers,
    getProfitAnalysis,
    getPaymentMethodBreakdown,
    getCustomerInsights,
    getSalesDetails,

    // POS Operations
    createSale,
    downloadInvoice,
    downloadAcknowledgement,
    printAcknowledgement,
    getAdvanceSales,
    printInvoice,
    silentPrintInvoice,
    getESCPOSData,
    getSales,
    getSaleById,
    addPaymentToSale,
    getSalePayments,
    completePendingPayment,
    bulkCompletePayments,
    createRefund,
    deleteSale,
    cancelSale,
    getPendingSales,

    // Loading states
    loading: {
      dashboard: dashboardFetch.loading,
      stats: statsFetch.loading,
      revenue: revenueFetch.loading,
      trends: trendsFetch.loading,
      branch: branchFetch.loading,
      staff: staffFetch.loading,
      product: productFetch.loading,
      customers: topCustomersFetch.loading,
      profit: profitFetch.loading,
      paymentMethods: paymentMethodsFetch.loading,
      pos: posFetch.loading,
      pending: pendingFetch.loading,
      bulk: bulkFetch.loading,
    },

    // Error states
    error: {
      dashboard: dashboardFetch.error,
      stats: statsFetch.error,
      revenue: revenueFetch.error,
      trends: trendsFetch.error,
      branch: branchFetch.error,
      staff: staffFetch.error,
      product: productFetch.error,
      customers: topCustomersFetch.error,
      profit: profitFetch.error,
      paymentMethods: paymentMethodsFetch.error,
      pos: posFetch.error,
      pending: pendingFetch.error,
      bulk: bulkFetch.error,
    },
  };
};

export default useSales;
