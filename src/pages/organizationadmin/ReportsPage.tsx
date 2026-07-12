/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, Fragment } from "react";
import {
  FileText,
  Download,
  Users,
  UserCircle,
  type LucideIcon,
  ReceiptText,
  ChartColumn,
  ChartColumnStacked,
  ChartNoAxesCombined,
  ClipboardList,
  Settings2,
  Truck,
  Store,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ReportType, ReportPeriod, SalesView, DateBasis } from "../../types/reports.types";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import toast from "react-hot-toast";
import { useReports } from "../../hooks/useReports";
import useBusinessProfile from "../../hooks/useBusinessProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "../../utils/dateUtils";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(
    ReportType.SALES,
  );
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(
    ReportPeriod.MONTH,
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedSalesView, setSelectedSalesView] = useState<SalesView>(
    SalesView.TOTAL,
  );
  const [selectedDateBasis, setSelectedDateBasis] = useState<DateBasis>(
    DateBasis.UPDATED,
  );
  const [reportData, setReportData] = useState<any>(null);
  const [downloadFormat, setDownloadFormat] = useState<
    "json" | "pdf" | "excel" | "csv"
  >("excel");
  const [savingSettings, setSavingSettings] = useState(false);
  const [expandedOrderRows, setExpandedOrderRows] = useState<Set<string>>(new Set());

  const toggleOrderRowExpand = (rowKey: string) => {
    setExpandedOrderRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const { loading, generateReport, downloadReport } = useReports();
  const { businessData, loadBusinessProfile, updateReportSettings } =
    useBusinessProfile();

  useEffect(() => {
    loadBusinessProfile();
  }, [loadBusinessProfile]);

  const includeJobsheet = businessData?.reportIncludeJobsheet ?? true;
  const includeSupplierPayment =
    businessData?.reportIncludeSupplierPayment ?? true;

  const handleToggleSetting = async (
    key: "reportIncludeJobsheet" | "reportIncludeSupplierPayment",
    value: boolean,
  ) => {
    setSavingSettings(true);
    const result = await updateReportSettings({ [key]: value });
    setSavingSettings(false);
    if (result?.success) {
      toast.success("Report setting updated");
    } else {
      toast.error(result?.message || "Failed to update setting");
    }
  };

  const reportTypes: Array<{
    type: ReportType;
    label: string;
    icon: LucideIcon;
  }> = [
    { type: ReportType.SALES, label: "Sales Report", icon: ReceiptText },
    { type: ReportType.PROFIT_LOSS, label: "Profit & Loss", icon: ChartColumn },
    {
      type: ReportType.INVENTORY,
      label: "Inventory Report",
      icon: ChartColumnStacked,
    },
    {
      type: ReportType.STAFF_PERFORMANCE,
      label: "Staff Records",
      icon: Users,
    },
    {
      type: ReportType.CUSTOMER_ANALYSIS,
      label: "Customer Analysis",
      icon: UserCircle,
    },
    {
      type: ReportType.SHOP_PERFORMANCE,
      label: "Shop Performance",
      icon: ChartNoAxesCombined,
    },
    {
      type: ReportType.JOBSHEET,
      label: "Jobsheet Report",
      icon: ClipboardList,
    },
  ];

  const periods = [
    { period: ReportPeriod.TODAY, label: "Today" },
    { period: ReportPeriod.WEEK, label: "This Week" },
    { period: ReportPeriod.MONTH, label: "This Month" },
    { period: ReportPeriod.QUARTER, label: "This Quarter" },
    { period: ReportPeriod.YEAR, label: "This Year" },
    { period: ReportPeriod.CUSTOM, label: "Custom Range" },
  ];

  const salesViews: Array<{
    view: SalesView;
    label: string;
    description: string;
    icon: LucideIcon;
  }> = [
    {
      view: SalesView.TOTAL,
      label: "Total View",
      description: "All sales channels combined",
      icon: ReceiptText,
    },
    {
      view: SalesView.COURIER,
      label: "Courier Sales",
      description: "Orders shipped via courier (COURIER channel)",
      icon: Truck,
    },
    {
      view: SalesView.OFFLINE,
      label: "Offline Sales",
      description: "In-store POS / walk-in sales",
      icon: Store,
    },
  ];

  const reportsWithDateBasis: ReportType[] = [
    ReportType.STAFF_PERFORMANCE,
    ReportType.CUSTOMER_ANALYSIS,
    ReportType.SHOP_PERFORMANCE,
  ];

  const handleGenerateReport = async () => {
    if (selectedPeriod === ReportPeriod.CUSTOM && (!startDate || !endDate)) {
      toast.error("Please select both start and end dates for custom range.");
      return;
    }
    try {
      const response = await generateReport({
        reportType: selectedReport,
        period: selectedPeriod,
        format: "json",
        startDate:
          selectedPeriod === ReportPeriod.CUSTOM ? startDate : undefined,
        endDate: selectedPeriod === ReportPeriod.CUSTOM ? endDate : undefined,
        ...(reportsWithDateBasis.includes(selectedReport)
          ? { dateBasis: selectedDateBasis }
          : {}),
        ...(selectedReport === ReportType.SALES
          ? { salesView: selectedSalesView }
          : {}),
      });

      if (response && response.data) {
        setReportData(response.data);
        setExpandedOrderRows(new Set());
      }
      // console.log('Generated Report Data:',reportData);
      toast.success("Report generated successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate report";
      toast.error(errorMessage);
    }
  };

  const handleDownload = async () => {
    if (selectedPeriod === ReportPeriod.CUSTOM && (!startDate || !endDate)) {
      toast.error("Please select both start and end dates for custom range.");
      return;
    }
    try {
      await downloadReport({
        reportType: selectedReport,
        period: selectedPeriod,
        format: downloadFormat,
        startDate:
          selectedPeriod === ReportPeriod.CUSTOM ? startDate : undefined,
        endDate: selectedPeriod === ReportPeriod.CUSTOM ? endDate : undefined,
        ...(reportsWithDateBasis.includes(selectedReport)
          ? { dateBasis: selectedDateBasis }
          : {}),
        ...(selectedReport === ReportType.SALES
          ? { salesView: selectedSalesView }
          : {}),
      });
      toast.success("Report downloaded successfully");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to download report";
      toast.error(errorMessage);
    }
  };
  const formatNumber = (value: any, digits = 2) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "-";
  };
  const formatCurrency = (value: any, digits = 2) => {
    const n = Number(value);
    return Number.isFinite(n) ? `Rs. ${n.toFixed(digits)}` : "-";
  };

  const formatDateRange = (dateRange?: { start?: string; end?: string }) => {
    if (!dateRange?.start || !dateRange?.end) return null;
    const start = new Date(dateRange.start).toLocaleDateString();
    const end = new Date(dateRange.end).toLocaleDateString();
    return `${start} — ${end}`;
  };

  const renderStaffProductTable = (
    title: string,
    products: any[],
    accentClass: string,
  ) => {
    if (!products?.length) {
      return (
        <p className="px-4 py-2 text-sm text-gray-400 italic">
          No {title.toLowerCase()} for this period.
        </p>
      );
    }

    const totalQty = products.reduce(
      (sum, p) => sum + (Number(p.totalQuantity) || 0),
      0,
    );
    const totalRevenue = products.reduce(
      (sum, p) => sum + (Number(p.totalRevenue) || 0),
      0,
    );

    return (
      <div className="border-t border-gray-100">
        <div className={`px-4 py-2 text-xs font-semibold uppercase ${accentClass}`}>
          {title}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Product
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  SKU
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Qty
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {products.map((p: any, pi: number) => (
                <tr key={pi} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    {p.productName}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500">
                    {p.sku || "-"}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">
                    {p.totalQuantity}
                  </td>
                  <td className="px-4 py-2 text-sm text-right font-semibold text-orange-600">
                    {formatCurrency(p.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 uppercase"
                >
                  Total
                </td>
                <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                  {totalQty}
                </td>
                <td className="px-4 py-2 text-sm font-bold text-orange-600 text-right">
                  {formatCurrency(totalRevenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };
  const renderReportTable = (reportType: ReportType, data: any) => {
    console.log(data);
    switch (reportType) {
      case ReportType.SALES:
        return (
          <div className="space-y-6">
            {/* View & timezone context */}
            {(data.salesViewLabel || data.dateFilter) && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 bg-orange-50 border border-orange-100 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {data.salesViewLabel || "Total Sales"}
                  </p>
                  <p className="text-xs text-orange-700 mt-0.5">
                    {data.salesView === "courier"
                      ? "Courier channel orders only (sale_channel = COURIER)"
                      : data.salesView === "offline"
                        ? "In-store POS orders only (sale_channel = POS)"
                        : "All channels: POS, Courier, and WooCommerce"}
                  </p>
                </div>
                {data.dateFilter && (
                  <p className="text-xs text-gray-600">
                    Filtered in {data.dateFilter.timezone || "Asia/Colombo"}{" "}
                    (Sri Lanka time)
                    {data.dateFilter.description && (
                      <span className="block mt-0.5 text-gray-500">
                        {data.dateFilter.description}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}

            {/* Summary */}
            {data.summary && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.summary.totalSales}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(data.summary?.netRevenue)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Profit</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(data.summary?.totalProfit)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatNumber(data.summary?.profitMargin)}%
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.summary?.averageOrderValue)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Products Sold */}
            {data.topProducts && data.topProducts.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Products Sold ({data.topProducts.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.topProducts.map((product: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(product?.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(product?.profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(product?.profitMargin)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Locations */}
            {data.topLocations && data.topLocations.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Top Locations
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.topLocations.map((location: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {location.locationName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.locationType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.sales}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(location?.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(location?.profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(location?.profitMargin)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sales by Day */}
            {data.salesByDay && data.salesByDay.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Sales by Day
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Order Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unique Customers
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.salesByDay.map((day: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {day.sales}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(day?.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(day?.profit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(day?.averageOrderValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {day.uniqueCustomers}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {data.paymentMethods && data.paymentMethods.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Payment Methods
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Method
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sales Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Transaction
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.paymentMethods.map((method: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {method.method}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {method.count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(method?.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {method.salesCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(method?.averageTransaction)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Refund Analysis */}
            {data.refundAnalysis && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Refund Analysis
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Refunds</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.refundAnalysis?.totalRefunds)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Refund Count</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.refundAnalysis.refundCount}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Refund Rate</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatNumber(data.refundAnalysis.refundRate)}%
                    </p>
                  </div>
                </div>
                {data.refundAnalysis.topRefundReasons &&
                  data.refundAnalysis.topRefundReasons.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/20">
                        <thead className="bg-white/30 backdrop-blur-sm">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reason
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Count
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/20">
                          {data.refundAnalysis.topRefundReasons.map(
                            (reason: any, index: number) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {reason.reason}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {reason.count}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatCurrency(reason?.amount)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}

            {/* Sale Transactions */}
            {data.saleTransactions && data.saleTransactions.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Sale Transactions ({data.saleTransactions.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invoice #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.saleTransactions.map((txn: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                            {txn.invoiceNumber || "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {txn.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {txn.locationName}
                            {txn.locationCode && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({txn.locationCode})
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {txn.date || txn.paymentDate
                              ? formatDateTime(txn.date || txn.paymentDate)
                              : "—"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {txn.itemCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {formatCurrency(txn.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-700">
                            {formatCurrency(txn.paidAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                txn.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : txn.status === "cancelled"
                                    ? "bg-red-100 text-red-800"
                                    : txn.status === "refunded"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {txn.status || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                txn.paymentStatus === "COMPLETED"
                                  ? "bg-green-100 text-green-800"
                                  : txn.paymentStatus === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : txn.paymentStatus === "PARTIAL"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {txn.paymentStatus || "—"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Orders (unified POS + courier — same shape as All Orders) */}
            {data.orders && data.orders.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Orders ({data.orders.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8" />
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sale #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Tracking #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          AWB #
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Channel
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.orders.map((order: any) => {
                        const rowKey = `${order.orderType}-${order.id}`;
                        const hasItems = order.items && order.items.length > 0;
                        const isExpanded = expandedOrderRows.has(rowKey);
                        return (
                          <Fragment key={rowKey}>
                            <tr>
                              <td className="px-3 py-3">
                                {hasItems && (
                                  <button
                                    type="button"
                                    onClick={() => toggleOrderRowExpand(rowKey)}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                                {order.orderNumber || "—"}
                                {order.shipmentNumber &&
                                  order.shipmentNumber !== order.orderNumber && (
                                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                      SHP: {order.shipmentNumber}
                                    </div>
                                  )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                {order.saleNumber || "—"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                {order.trackingNumber || "—"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                {order.awbNumber || "—"}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                  {order.channel || order.orderType}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>{order.customerName}</div>
                                {order.customerPhone && (
                                  <div className="text-xs text-gray-400">
                                    {order.customerPhone}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-4 text-sm text-gray-500">
                                {hasItems ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleOrderRowExpand(rowKey)}
                                    className="text-left hover:text-orange-600"
                                  >
                                    <div className="truncate max-w-[140px]">
                                      {order.items[0].name}
                                    </div>
                                    {order.items.length > 1 && (
                                      <div className="text-[10px] text-blue-500">
                                        +{order.items.length - 1} more
                                      </div>
                                    )}
                                  </button>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                {formatCurrency(order.totalAmount)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-green-700">
                                {formatCurrency(order.paidAmount)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-amber-700">
                                {formatCurrency(order.balanceAmount)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm font-semibold text-yellow-700">
                                {formatCurrency(order.profit)}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm">
                                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {(order.status || "—").replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                    order.paymentStatus === "COMPLETED"
                                      ? "bg-green-100 text-green-800"
                                      : order.paymentStatus === "PENDING"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {order.paymentStatus || "—"}
                                </span>
                                {order.paymentMethod && (
                                  <div className="text-[10px] text-gray-400 mt-0.5">
                                    {order.paymentMethod}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.locationName || "—"}
                                {order.soldBy && (
                                  <div className="text-[10px] text-gray-400">
                                    {order.soldBy}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.paymentDate
                                  ? formatDateTime(order.paymentDate)
                                  : "—"}
                              </td>
                            </tr>
                            {isExpanded && hasItems && (
                              <tr key={`${rowKey}-items`}>
                                <td colSpan={15} className="px-6 py-3 bg-white/20">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-gray-500">
                                        <th className="text-left py-1 pr-4">
                                          Product
                                        </th>
                                        <th className="text-left py-1 pr-4">
                                          SKU
                                        </th>
                                        <th className="text-right py-1 pr-4">
                                          Qty
                                        </th>
                                        <th className="text-right py-1 pr-4">
                                          Unit Price
                                        </th>
                                        <th className="text-right py-1">
                                          Subtotal
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {order.items.map(
                                        (item: any, idx: number) => (
                                          <tr
                                            key={idx}
                                            className="border-t border-white/10"
                                          >
                                            <td className="py-1 pr-4 text-gray-800">
                                              {item.name}
                                            </td>
                                            <td className="py-1 pr-4 text-gray-500">
                                              {item.sku || "—"}
                                            </td>
                                            <td className="py-1 pr-4 text-right text-gray-700">
                                              {item.quantity}
                                            </td>
                                            <td className="py-1 pr-4 text-right text-gray-700">
                                              {formatCurrency(item.unitPrice)}
                                            </td>
                                            <td className="py-1 text-right font-medium text-gray-900">
                                              {formatCurrency(item.subtotal)}
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Top Customers */}
            {data.topCustomers && data.topCustomers.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Top Customers
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchases
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Spent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Order Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.topCustomers.map((customer: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.phone}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.purchases}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(customer?.totalSpent)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(customer?.averageOrderValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case ReportType.INVENTORY:
        return (
          <div className="space-y-6">
            {/* Summary */}
            {data.summary && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Inventory Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.summary.totalItems}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.summary?.totalValue)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Retail Value</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(data.summary?.totalRetailValue)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Potential Profit</p>
                    <p
                      className={`text-2xl font-bold ${data.summary.potentialProfit >= 0 ? "text-yellow-600" : "text-red-600"}`}
                    >
                      {formatCurrency(data.summary?.potentialProfit)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Quantity</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {data.summary.totalQuantity}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Stock Health Score</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.summary.stockHealthScore}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.summary.lowStockItems}
                    </p>
                  </div>
                  <div className="bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                    <p className="text-sm text-gray-600">Out of Stock Items</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {data.summary.outOfStockItems}
                    </p>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Optimal Stock Items</p>
                    <p className="text-2xl font-bold text-teal-600">
                      {data.summary.optimalStockItems}
                    </p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Excess Stock Items</p>
                    <p className="text-2xl font-bold text-pink-600">
                      {data.summary.excessStockItems}
                    </p>
                  </div>
                  <div className="bg-cyan-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Inventory Turnover</p>
                    <p className="text-2xl font-bold text-cyan-600">
                      {formatNumber(data.summary?.inventoryTurnover)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Category Wise Breakdown */}
            {data.categoryWise && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Category Wise Breakdown
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Potential Profit
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit Margin
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.categoryWise.map((category: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {category.categoryName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.items}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {category.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(category?.value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(category?.potentialProfit)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(category?.profitMargin)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Fast Moving Items */}
            {data.fastMovingItems && data.fastMovingItems.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Fast Moving Items
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity Sold
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Turnover Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.fastMovingItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantitySold}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatNumber(item?.turnoverRate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item?.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Slow Moving Items */}
            {data.slowMovingItems && data.slowMovingItems.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Warehouse Store
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days in Stock
                        </th> */}
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Stock Level
                        </th> */}
                        {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th> */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.slowMovingItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.category}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.daysInStock}
                          </td> */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item?.value)}
                          </td>
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.minStockLevel}
                          </td> */}
                          {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.location}
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Low Stock Alerts */}
            {data.lowStockAlerts && data.lowStockAlerts.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Low Stock Alerts
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Current Stock
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Stock Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reorder Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.lowStockAlerts.map((alert: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {alert.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {alert.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {alert.currentStock}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {alert.minStockLevel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {alert.reorderQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {alert.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Out of Stock List */}
            {data.outOfStockList && data.outOfStockList.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Out of Stock Items
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Min Stock Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reorder Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.outOfStockList.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.sku}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.minStockLevel}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.reorderQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.location}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Location Wise Inventory */}
            {data.locationWise && data.locationWise.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Location Wise Inventory Branch Warehouse
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Items
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Low Stock Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Out of Stock Count
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock Health
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.locationWise.map((location: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {location.locationName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.locationType.charAt(0).toUpperCase() +
                              location.locationType.slice(1).toLowerCase()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.totalItems}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.totalQuantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(location?.totalValue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.lowStockCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.outOfStockCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {location.stockHealth}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Stock Aging */}
            {data.stockAging && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Stock Aging Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Fresh Stock</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.stockAging.fresh}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Moderate Age</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.stockAging.moderate}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Old Stock</p>
                    <p className="text-2xl font-bold text-red-600">
                      {data.stockAging.old}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case ReportType.STAFF_PERFORMANCE: {
        const staffList =
          data.staffRecords?.length > 0
            ? data.staffRecords
            : data.topPerformers || [];
        const dateRangeLabel = formatDateRange(data.dateRange);

        return (
          <div className="space-y-6">
            {dateRangeLabel && (
              <p className="text-sm text-gray-500">
                Report period:{" "}
                <span className="font-medium text-gray-800">
                  {dateRangeLabel}
                </span>
              </p>
            )}
            {data.dateFilter?.description && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                {data.dateFilter.description}
              </p>
            )}

            {data.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Total Staff",
                    value: data.summary.totalStaff,
                    bg: "bg-gray-50 text-gray-900",
                  },
                  {
                    label: "Active Staff",
                    value: data.summary.activeStaff,
                    bg: "bg-gray-50 text-gray-900",
                  },
                  {
                    label: "Completed Orders",
                    value: `${data.summary.completedOrdersCount || 0} (${formatCurrency(data.summary.completedOrdersAmount || 0)})`,
                    bg: "bg-green-50 text-green-700",
                  },
                  {
                    label: "Processing Orders",
                    value: `${data.summary.processingOrdersCount || 0} (${formatCurrency(data.summary.processingOrdersAmount || 0)})`,
                    bg: "bg-yellow-50 text-yellow-700",
                  },
                  {
                    label: "Returned Orders",
                    value: `${data.summary.returnedOrdersCount || 0} (${formatCurrency(data.summary.returnedOrdersAmount || 0)})`,
                    bg: "bg-red-50 text-red-700",
                  },
                  {
                    label: "Products Sold Qty",
                    value: data.summary.totalCompletedProductQty || 0,
                    bg: "bg-emerald-50 text-emerald-700",
                  },
                  {
                    label: "Processing Product Qty",
                    value: data.summary.totalProcessingProductQty || 0,
                    bg: "bg-amber-50 text-amber-700",
                  },
                  {
                    label: "Returned Product Qty",
                    value: data.summary.totalReturnedProductQty || 0,
                    bg: "bg-rose-50 text-rose-700",
                  },
                  {
                    label: "Total Revenue",
                    value: formatCurrency(data.summary.totalRevenue),
                    bg: "bg-orange-50 text-orange-700",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`${item.bg} rounded-lg p-4 text-center border border-black/5`}
                  >
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      {item.label}
                    </p>
                    <p className="text-sm sm:text-base font-bold mt-1 break-words">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {data.productSuccessRates?.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Product Success Rates (All Staff)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          SKU
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Completed
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Returned
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                          Success Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.productSuccessRates.map((p: any) => (
                        <tr key={p.productId} className="hover:bg-white/20">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {p.productName}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {p.sku || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-700">
                            {p.completedQty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600">
                            {p.returnedQty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-violet-700">
                            {formatNumber(p.successRate, 1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <h4 className="text-md font-semibold text-gray-900">
              Staff Records ({staffList.length})
            </h4>

            {staffList.map((staff: any, index: number) => {
              const hasActivity =
                (staff.totalSales || 0) > 0 ||
                (staff.completedJobs || 0) > 0 ||
                (staff.processingOrdersCount || 0) > 0 ||
                (staff.returnedOrdersCount || 0) > 0;

              return (
                <div
                  key={staff.staffId || index}
                  className={`border rounded-lg overflow-hidden ${hasActivity ? "border-gray-200" : "border-gray-100 opacity-80"}`}
                >
                  <div className="bg-orange-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {staff.staffName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {staff.position}{" "}
                        {staff.phone !== "N/A" ? `• ${staff.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Completed Sales</p>
                        <p className="font-bold text-green-700">
                          {staff.totalSales || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="font-bold text-orange-600">
                          {formatCurrency(staff.totalRevenue)}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Sold Qty</p>
                        <p className="font-bold text-emerald-700">
                          {staff.completedProductQty || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Customers</p>
                        <p className="font-bold text-gray-900">
                          {staff.uniqueCustomers}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white px-4 py-3 border-b border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center text-xs sm:text-sm">
                    <div className="p-2 rounded bg-green-50 text-green-800">
                      <p className="text-[10px] text-green-600 uppercase font-medium">
                        Completed
                      </p>
                      <p className="font-bold mt-0.5">
                        {staff.completedOrdersCount || 0} orders •{" "}
                        {staff.completedProductQty || 0} items
                      </p>
                      <p className="text-xs mt-0.5">
                        {formatCurrency(staff.completedOrdersAmount || 0)}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-yellow-50 text-yellow-800">
                      <p className="text-[10px] text-yellow-600 uppercase font-medium">
                        Processing
                      </p>
                      <p className="font-bold mt-0.5">
                        {staff.processingOrdersCount || 0} orders •{" "}
                        {staff.processingProductQty || 0} items
                      </p>
                      <p className="text-xs mt-0.5">
                        {formatCurrency(staff.processingOrdersAmount || 0)}
                      </p>
                    </div>
                    <div className="p-2 rounded bg-red-50 text-red-800">
                      <p className="text-[10px] text-red-600 uppercase font-medium">
                        Returned
                      </p>
                      <p className="font-bold mt-0.5">
                        {staff.returnedOrdersCount || 0} orders •{" "}
                        {staff.returnedProductQty || 0} items
                      </p>
                      <p className="text-xs mt-0.5">
                        {formatCurrency(staff.returnedOrdersAmount || 0)}
                      </p>
                    </div>
                  </div>

                  {renderStaffProductTable(
                    "Completed Products Sold",
                    staff.completedProductBreakdown || staff.productBreakdown,
                    "text-green-700 bg-green-50/50",
                  )}
                  {renderStaffProductTable(
                    "Processing Products",
                    staff.processingProductBreakdown,
                    "text-yellow-700 bg-yellow-50/50",
                  )}
                  {renderStaffProductTable(
                    "Returned Products",
                    staff.returnedProductBreakdown,
                    "text-red-700 bg-red-50/50",
                  )}

                  {staff.productSuccessRates?.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 py-2 text-xs font-semibold uppercase text-violet-700 bg-violet-50/50">
                        Product Success Rates
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Product
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                SKU
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Completed
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Returned
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Success Rate
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-50">
                            {staff.productSuccessRates.map((p: any) => (
                              <tr key={p.productId} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {p.productName}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {p.sku || "—"}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-green-700">
                                  {p.completedQty}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-red-600">
                                  {p.returnedQty}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-bold text-violet-700">
                                  {p.successRate?.toFixed?.(1) ?? p.successRate}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {staff.sales?.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 py-2 text-xs font-semibold uppercase text-indigo-700 bg-indigo-50/50">
                        Sales Details (
                        {staff.sales.reduce(
                          (sum: number, sale: any) =>
                            sum + (sale.items?.length || 1),
                          0,
                        )}{" "}
                        line items)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Sale #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Shipment #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Tracking #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Activity Date
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Created
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Updated
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Customer
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Channel
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Product
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                SKU
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Status
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Payment
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Qty
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Line Amount
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Sale Total
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Paid
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Balance
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-50">
                            {staff.sales.flatMap((sale: any, si: number) => {
                              const lineItems =
                                sale.items?.length > 0
                                  ? sale.items
                                  : [
                                      {
                                        productName: "—",
                                        sku: "",
                                        quantity: sale.itemQuantity || 0,
                                        subtotal: sale.totalAmount || 0,
                                      },
                                    ];
                              return lineItems.map((item: any, ii: number) => (
                                <tr
                                  key={`${si}-${ii}`}
                                  className="hover:bg-gray-50"
                                >
                                  {ii === 0 ? (
                                    <>
                                      <td
                                        className="px-4 py-2 text-sm font-medium text-gray-900 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.saleNumber}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 font-mono align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.shipmentNumber || "—"}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 font-mono align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.trackingNumber || "—"}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.date
                                          ? new Date(sale.date).toLocaleDateString()
                                          : "—"}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.orderCreatedAt
                                          ? formatDateTime(sale.orderCreatedAt)
                                          : "—"}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.orderUpdatedAt
                                          ? formatDateTime(sale.orderUpdatedAt)
                                          : "—"}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-700 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        <div>{sale.customerName}</div>
                                        {sale.customerPhone && (
                                          <div className="text-xs text-gray-400">
                                            {sale.customerPhone}
                                          </div>
                                        )}
                                      </td>
                                      <td
                                        className="px-4 py-2 text-sm text-gray-500 align-top"
                                        rowSpan={lineItems.length}
                                      >
                                        {sale.channel || "POS"}
                                      </td>
                                    </>
                                  ) : null}
                                  <td className="px-4 py-2 text-sm text-gray-800">
                                    {item.productName || "—"}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-400 font-mono">
                                    {item.sku || "—"}
                                  </td>
                                  {ii === 0 ? (
                                    <td
                                      className="px-4 py-2 text-sm align-top"
                                      rowSpan={lineItems.length}
                                    >
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                          sale.status === "COMPLETED"
                                            ? "bg-green-100 text-green-700"
                                            : sale.status === "REFUNDED" ||
                                                sale.status === "PARTIAL_REFUND"
                                              ? "bg-red-100 text-red-700"
                                              : "bg-yellow-100 text-yellow-700"
                                        }`}
                                      >
                                        {sale.status}
                                      </span>
                                    </td>
                                  ) : null}
                                  {ii === 0 ? (
                                    <td
                                      className="px-4 py-2 text-sm align-top"
                                      rowSpan={lineItems.length}
                                    >
                                      <span
                                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                                          sale.paymentStatus === "COMPLETED"
                                            ? "bg-green-100 text-green-700"
                                            : sale.paymentStatus === "PENDING"
                                              ? "bg-yellow-100 text-yellow-700"
                                              : "bg-gray-100 text-gray-700"
                                        }`}
                                      >
                                        {sale.paymentStatus || "—"}
                                      </span>
                                      {sale.paymentMethod && (
                                        <div className="text-[10px] text-gray-400 mt-0.5">
                                          {sale.paymentMethod}
                                        </div>
                                      )}
                                    </td>
                                  ) : null}
                                  <td className="px-4 py-2 text-sm text-right text-gray-900">
                                    {item.quantity ?? 0}
                                  </td>
                                  <td className="px-4 py-2 text-sm text-right text-gray-700">
                                    {formatCurrency(item.subtotal ?? 0)}
                                  </td>
                                  {ii === 0 ? (
                                    <td
                                      className="px-4 py-2 text-sm text-right font-semibold text-orange-600 align-top"
                                      rowSpan={lineItems.length}
                                    >
                                      {formatCurrency(sale.totalAmount)}
                                    </td>
                                  ) : null}
                                  {ii === 0 ? (
                                    <td
                                      className="px-4 py-2 text-sm text-right text-green-700 align-top"
                                      rowSpan={lineItems.length}
                                    >
                                      {formatCurrency(sale.paidAmount)}
                                    </td>
                                  ) : null}
                                  {ii === 0 ? (
                                    <td
                                      className="px-4 py-2 text-sm text-right text-amber-700 align-top"
                                      rowSpan={lineItems.length}
                                    >
                                      {formatCurrency(sale.balanceAmount)}
                                    </td>
                                  ) : null}
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {staff.returns?.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="px-4 py-2 text-xs font-semibold uppercase text-rose-700 bg-rose-50/50">
                        Return Details ({staff.returns.length})
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Return #
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Product
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Qty
                              </th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Refund
                              </th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Sale #
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-50">
                            {staff.returns.map((ret: any, ri: number) => (
                              <tr key={ri} className="hover:bg-gray-50">
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {ret.returnNumber}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-700">
                                  {ret.productName}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-900">
                                  {ret.quantity}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-red-600">
                                  {formatCurrency(ret.refundAmount)}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {ret.saleNumber || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {data.underperformingStaff &&
              data.underperformingStaff.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-700 mb-2">
                    Staff with No Activity
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.underperformingStaff.map((s: any, i: number) => (
                      <span
                        key={i}
                        className="bg-gray-50 text-gray-600 text-xs font-medium px-3 py-1 rounded-full border border-gray-200"
                      >
                        {s.staffName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>
        );
      }

      case ReportType.CUSTOMER_ANALYSIS:
        return (
          <div className="space-y-6">
            {data.dateFilter?.description && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                {data.dateFilter.description}
              </p>
            )}

            {data.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Customers", value: data.summary.totalCustomers, bg: "bg-gray-50 text-gray-900" },
                  { label: "Active Customers", value: data.summary.activeCustomers, bg: "bg-orange-50 text-orange-700" },
                  { label: "Completed Orders", value: data.summary.completed ?? data.orderStatusSummary?.completed ?? 0, bg: "bg-green-50 text-green-700" },
                  { label: "Processing Orders", value: data.summary.processing ?? data.orderStatusSummary?.processing ?? 0, bg: "bg-yellow-50 text-yellow-700" },
                  { label: "Returned Orders", value: data.summary.returned ?? data.orderStatusSummary?.returned ?? 0, bg: "bg-red-50 text-red-700" },
                  { label: "Total Revenue", value: formatCurrency(data.summary.totalRevenue), bg: "bg-emerald-50 text-emerald-700" },
                  { label: "Retention Rate", value: `${formatNumber(data.summary.customerRetentionRate)}%`, bg: "bg-indigo-50 text-indigo-700" },
                  { label: "Avg Customer Value", value: formatCurrency(data.summary.averageCustomerValue), bg: "bg-purple-50 text-purple-700" },
                ].map((item, i) => (
                  <div key={i} className={`${item.bg} rounded-lg p-4 text-center border border-black/5`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
                    <p className="text-sm sm:text-base font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Top Customers</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-3 py-3 w-8" />
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Processing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Returned</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Purchase</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {data.topCustomers?.map((customer: any, index: number) => {
                      const rowKey = `cust-${customer.customerId || index}`;
                      const hasOrders = customer.orders?.length > 0;
                      const isExpanded = expandedOrderRows.has(rowKey);
                      return (
                        <Fragment key={rowKey}>
                          <tr>
                            <td className="px-3 py-3">
                              {hasOrders && (
                                <button type="button" onClick={() => toggleOrderRowExpand(rowKey)} className="text-gray-400 hover:text-gray-600">
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-4 text-sm">
                              <div className="font-medium text-gray-900">{customer.customerName}</div>
                              {customer.phone && <div className="text-xs text-gray-400">{customer.phone}</div>}
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-500">{customer.totalPurchases}</td>
                            <td className="px-4 py-4 text-sm text-green-700">{customer.completedOrders ?? 0}</td>
                            <td className="px-4 py-4 text-sm text-yellow-700">{customer.processingOrders ?? 0}</td>
                            <td className="px-4 py-4 text-sm text-red-700">{customer.returnedOrders ?? 0}</td>
                            <td className="px-4 py-4 text-sm font-semibold text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                            <td className="px-4 py-4 text-sm text-gray-500">
                              {customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString() : "—"}
                            </td>
                          </tr>
                          {isExpanded && hasOrders && (
                            <tr>
                              <td colSpan={8} className="px-4 py-3 bg-white/20">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500">
                                      <th className="text-left py-1 pr-3">Sale #</th>
                                      <th className="text-left py-1 pr-3">Date</th>
                                      <th className="text-left py-1 pr-3">Status</th>
                                      <th className="text-left py-1 pr-3">Category</th>
                                      <th className="text-left py-1 pr-3">Channel</th>
                                      <th className="text-right py-1 pr-3">Amount</th>
                                      <th className="text-right py-1">Paid</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customer.orders.map((order: any, oi: number) => (
                                      <tr key={oi} className="border-t border-gray-100">
                                        <td className="py-1 pr-3 font-mono text-orange-600">{order.saleNumber || "—"}</td>
                                        <td className="py-1 pr-3">{order.date ? formatDateTime(order.date) : "—"}</td>
                                        <td className="py-1 pr-3">{(order.status || "—").replace(/_/g, " ")}</td>
                                        <td className="py-1 pr-3 capitalize">{order.category || "—"}</td>
                                        <td className="py-1 pr-3">{order.channel || "—"}</td>
                                        <td className="py-1 pr-3 text-right">{formatCurrency(order.totalAmount)}</td>
                                        <td className="py-1 text-right text-green-700">{formatCurrency(order.paidAmount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case ReportType.SHOP_PERFORMANCE:
        return (
          <div className="space-y-6">
            {data.dateFilter?.description && (
              <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                {data.dateFilter.description}
              </p>
            )}

            {data.summary && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[
                  { label: "Active Locations", value: data.summary.activeLocations, bg: "bg-gray-50 text-gray-900" },
                  { label: "Total Sales", value: data.summary.totalSales, bg: "bg-orange-50 text-orange-700" },
                  { label: "Completed Orders", value: data.summary.completed ?? data.orderStatusSummary?.completed ?? 0, bg: "bg-green-50 text-green-700" },
                  { label: "Processing Orders", value: data.summary.processing ?? data.orderStatusSummary?.processing ?? 0, bg: "bg-yellow-50 text-yellow-700" },
                  { label: "Returned Orders", value: data.summary.returned ?? data.orderStatusSummary?.returned ?? 0, bg: "bg-red-50 text-red-700" },
                  { label: "Total Revenue", value: formatCurrency(data.summary.totalRevenue), bg: "bg-emerald-50 text-emerald-700" },
                  { label: "Total Profit", value: formatCurrency(data.summary.totalProfit), bg: "bg-purple-50 text-purple-700" },
                  { label: "Jobsheets", value: data.summary.totalJobsheets ?? 0, bg: "bg-indigo-50 text-indigo-700" },
                ].map((item, i) => (
                  <div key={i} className={`${item.bg} rounded-lg p-4 text-center border border-black/5`}>
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{item.label}</p>
                    <p className="text-sm sm:text-base font-bold mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Top Performing Locations</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profit Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {data.topPerformingLocations?.map((location: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{location.locationName}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{location.locationType}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{location.totalSales}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{formatCurrency(location.totalRevenue)}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{location.profitMargin?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {data.locationDetails?.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Location Details (All Orders)</h4>
                {data.locationDetails.map((loc: any) => {
                  const rowKey = `shop-${loc.locationId}`;
                  const isExpanded = expandedOrderRows.has(rowKey);
                  return (
                    <div key={loc.locationId} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleOrderRowExpand(rowKey)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                      >
                        <div>
                          <span className="font-semibold text-gray-900">{loc.locationName}</span>
                          <span className="ml-2 text-xs text-gray-500">{loc.locationType}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-green-700">✓ {loc.completedOrdersCount}</span>
                          <span className="text-yellow-700">⏳ {loc.processingOrdersCount}</span>
                          <span className="text-red-700">↩ {loc.returnedOrdersCount}</span>
                          <span className="font-semibold text-gray-800">{formatCurrency(loc.revenue)}</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-4 space-y-4 bg-white">
                          {loc.productWise?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Products</p>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead><tr className="text-gray-500"><th className="text-left py-1">Product</th><th className="text-left py-1">SKU</th><th className="text-right py-1">Qty</th><th className="text-right py-1">Revenue</th></tr></thead>
                                  <tbody>
                                    {loc.productWise.map((p: any, pi: number) => (
                                      <tr key={pi} className="border-t border-gray-50"><td className="py-1">{p.productName}</td><td className="py-1 font-mono">{p.sku}</td><td className="py-1 text-right">{p.quantity}</td><td className="py-1 text-right">{formatCurrency(p.revenue)}</td></tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {loc.staffWise?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Staff</p>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead><tr className="text-gray-500"><th className="text-left py-1">Staff</th><th className="text-right py-1">Sales</th><th className="text-right py-1">Revenue</th></tr></thead>
                                  <tbody>
                                    {loc.staffWise.map((s: any, si: number) => (
                                      <tr key={si} className="border-t border-gray-50"><td className="py-1">{s.staffName}</td><td className="py-1 text-right">{s.sales}</td><td className="py-1 text-right">{formatCurrency(s.revenue)}</td></tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {loc.sales?.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">All Orders ({loc.sales.length})</p>
                              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-500">
                                      <th className="text-left py-1 pr-2">Sale #</th>
                                      <th className="text-left py-1 pr-2">Date</th>
                                      <th className="text-left py-1 pr-2">Customer</th>
                                      <th className="text-left py-1 pr-2">Staff</th>
                                      <th className="text-left py-1 pr-2">Status</th>
                                      <th className="text-left py-1 pr-2">Category</th>
                                      <th className="text-right py-1 pr-2">Amount</th>
                                      <th className="text-right py-1">Paid</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {loc.sales.map((sale: any, si: number) => (
                                      <tr key={si} className="border-t border-gray-50">
                                        <td className="py-1 pr-2 font-mono text-orange-600">{sale.saleNumber}</td>
                                        <td className="py-1 pr-2">{sale.date ? formatDateTime(sale.date) : "—"}</td>
                                        <td className="py-1 pr-2">{sale.customerName}</td>
                                        <td className="py-1 pr-2">{sale.staffName}</td>
                                        <td className="py-1 pr-2">{(sale.status || "").replace(/_/g, " ")}</td>
                                        <td className="py-1 pr-2 capitalize">{sale.category}</td>
                                        <td className="py-1 pr-2 text-right">{formatCurrency(sale.totalAmount)}</td>
                                        <td className="py-1 text-right text-green-700">{formatCurrency(sale.paidAmount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case ReportType.PROFIT_LOSS:
        return (
          <div className="space-y-6">
            {/* Summary */}
            {data?.summary && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Profit & Loss Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(data.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Gross Profit</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(data.summary?.grossProfit)}
                    </p>
                  </div>
                  {/* <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p className={`text-2xl font-bold ${data.summary.netProfit >= 0 ? 'text-purple-600' : 'text-red-600'}`}>
                      Rs. {data.summary.netProfit?.toFixed(2)}
                    </p>
                  </div> */}
                  {/* <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Operating Expenses</p>
                    <p className="text-2xl font-bold text-yellow-600">Rs. {data.summary.operatingExpenses?.toFixed(2)}</p>
                  </div> */}
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Gross Profit Margin</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatNumber(data.summary?.grossProfitMargin)}%
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Profit Margin</p>
                    <p
                      className={`text-2xl font-bold ${data.summary.netProfitMargin >= 0 ? "text-red-600" : "text-red-700"}`}
                    >
                      {formatNumber(data.summary?.netProfitMargin)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Income Breakdown */}
            {data?.incomeBreakdown && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Income Breakdown
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* POS Sales */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      POS Sales
                    </h5>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        Revenue:{" "}
                        {formatCurrency(
                          data.incomeBreakdown?.posSales?.revenue,
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Cost:{" "}
                        {formatCurrency(data.incomeBreakdown?.posSales?.cost)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Profit:{" "}
                        {formatCurrency(data.incomeBreakdown?.posSales?.profit)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Count: {data.incomeBreakdown.posSales?.count}
                      </p>
                    </div>
                  </div>
                  {/* Jobsheets */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      Jobsheets
                    </h5>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        Revenue:{" "}
                        {formatCurrency(
                          data.incomeBreakdown?.jobsheets?.revenue,
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Cost:{" "}
                        {formatCurrency(data.incomeBreakdown?.jobsheets?.cost)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Profit:{" "}
                        {formatCurrency(
                          data.incomeBreakdown?.jobsheets?.profit,
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Count: {data.incomeBreakdown.jobsheets?.count}
                      </p>
                    </div>
                  </div>
                  {/* Other Sales */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      Other Sales
                    </h5>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600">
                        Revenue:{" "}
                        {formatCurrency(
                          data.incomeBreakdown?.otherSales?.revenue,
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Cost:{" "}
                        {formatCurrency(data.incomeBreakdown?.otherSales?.cost)}
                      </p>
                      <p className="text-xs text-gray-600">
                        Profit:{" "}
                        {formatCurrency(
                          data.incomeBreakdown?.otherSales?.profit,
                        )}
                      </p>
                      <p className="text-xs text-gray-600">
                        Count: {data.incomeBreakdown.otherSales?.count}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Operating Expenses */}
            {data?.operatingExpenses && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Operating Expenses
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Supplier Payments</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.operatingExpenses?.supplierPayments)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Sale Refunds</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(data.operatingExpenses?.saleRefunds)}
                    </p>
                  </div>
                  {/* <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Salaries</p>
                    <p className="text-2xl font-bold text-yellow-600">Rs. {data.operatingExpenses.salaries?.toFixed(2)}</p>
                  </div> */}
                  {/* <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Rent</p>
                    <p className="text-2xl font-bold text-indigo-600">Rs. {data.operatingExpenses.rent?.toFixed(2)}</p>
                  </div> */}
                  {/* <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Utilities</p>
                    <p className="text-2xl font-bold text-purple-600">Rs. {data.operatingExpenses.utilities?.toFixed(2)}</p>
                  </div> */}
                  {/* <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Marketing</p>
                    <p className="text-2xl font-bold text-green-600">Rs. {data.operatingExpenses.marketing?.toFixed(2)}</p>
                  </div> */}
                  {/* <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Other</p>
                    <p className="text-2xl font-bold text-orange-600">Rs. {data.operatingExpenses.other?.toFixed(2)}</p>
                  </div> */}
                  <div className="bg-white/30 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {formatCurrency(data.operatingExpenses?.total)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Payments Details */}
            {data?.supplierPayments?.details &&
              data.supplierPayments.details.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">
                    Supplier Payments Details
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/20">
                      <thead className="bg-white/30 backdrop-blur-sm">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Number
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Supplier Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Method
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Payment Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            PO Number
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/20">
                        {data.supplierPayments.details.map(
                          (payment: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {payment.paymentNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.supplierName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(payment?.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.paymentMethod}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  payment.paymentDate,
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {payment.purchaseOrderNumber}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Jobsheets Summary */}
            {data?.jobsheets && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Jobsheets Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(data.jobsheets?.total)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Count</p>
                    <p className="text-2xl font-bold text-green-600">
                      {data.jobsheets.count}
                    </p>
                  </div>
                </div>
                {/* {data.jobsheets.topJobsheets && data.jobsheets.topJobsheets.length > 0 && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Top Jobsheets</h5>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-white/20">
                        <thead className="bg-white/30 backdrop-blur-sm">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Jobsheet Number
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Revenue
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Profit
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/20">
                          {data.jobsheets.topJobsheets.map((jobsheet: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {jobsheet.jobsheetNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Rs. {jobsheet.revenue?.toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                Rs. {jobsheet.profit?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )} */}
              </div>
            )}

            {/* Refunds Summary */}
            {data?.refunds && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Refunds Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Refunds</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(data.refunds?.total)}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Refund Count</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {data.refunds.count}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Profit & Loss Breakdown (if available) */}
            {data?.breakdown && data.breakdown.length > 0 && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Profit & Loss Breakdown
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/30 backdrop-blur-sm">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Revenue
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Costs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Profit
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/20">
                      {data.breakdown.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {new Date(item.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item?.revenue)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item?.costs)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(item?.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case ReportType.JOBSHEET:
        return (
          <div className="space-y-6">
            {/* Top Technicians */}
            {/* <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Top Technicians</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Technician Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completed Jobs
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Completion Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Time (hrs)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {data.topTechnicians?.map((tech: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {tech.technicianName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tech.completedJobs}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tech.completionRate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(tech?.totalRevenue || tech?.revenue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tech.avgCompletionTime}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div> */}

            {/* Top Customers */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Top Customers
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Jobs
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Job Value
                      </th> */}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {data.topCustomers?.map((customer: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {customer.customerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {customer.totalJobs}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Rs. {customer.totalSpent?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(customer?.averageJobValue)}
                        </td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Summary */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Status Summary
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                  <thead className="bg-white/30 backdrop-blur-sm">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Count
                      </th>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/20">
                    {data.statusSummary?.map((status: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {status.status}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {status.count}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          Rs. {status.revenue?.toFixed(2)}
                        </td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {status.percentage}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 mx-1 sm:mx-2 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
            Reports &amp; Analytics
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Generate comprehensive business reports
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={downloadFormat}
            onChange={(e) =>
              setDownloadFormat(
                e.target.value as "json" | "pdf" | "excel" | "csv",
              )
            }
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF (.pdf)</option>
            <option value="csv">CSV (.csv)</option>
            <option value="json">JSON (.json)</option>
          </select>
          <Button
            onClick={handleDownload}
            disabled={loading || !reportData}
            className="bg-green-600 hover:bg-green-700 inline-flex items-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Report Type
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            return (
              <button
                key={report.type}
                onClick={() => setSelectedReport(report.type)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedReport === report.type
                    ? "border-orange-400 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex justify-center mb-2">
                  <Icon
                    className={`w-8 h-8 ${
                      selectedReport === report.type
                        ? "text-orange-600"
                        : "text-gray-600"
                    }`}
                  />
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {report.label}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Period Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Select Period
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {periods.map((period) => (
            <button
              key={period.period}
              onClick={() => setSelectedPeriod(period.period)}
              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                selectedPeriod === period.period
                  ? "border-orange-400 bg-orange-50 text-orange-700"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-medium">{period.label}</div>
            </button>
          ))}
        </div>

        {/* Date basis: Staff / Shop / Customer reports only */}
        {reportsWithDateBasis.includes(selectedReport) && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter dates by
          </label>
          <div className="inline-flex rounded-lg border-2 border-gray-200 overflow-hidden">
            {[
              { basis: DateBasis.UPDATED, label: "Updated date" },
              { basis: DateBasis.ACTIVITY, label: "Activity date" },
            ].map((opt) => (
              <button
                key={opt.basis}
                type="button"
                onClick={() => setSelectedDateBasis(opt.basis)}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  selectedDateBasis === opt.basis
                    ? "bg-orange-50 text-orange-700"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-400">
            {selectedDateBasis === DateBasis.UPDATED
              ? "Any order updated in the period is included — even an older order — and the date shown is the exact update date."
              : "Orders included when their created / completed / status-changed date falls in the period."}
          </p>
        </div>
        )}

        {selectedPeriod === ReportPeriod.CUSTOM && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 bg-white text-gray-900"
              />
            </div>
          </div>
        )}
      </Card>

      {/* Sales Report View — Total / Courier / Offline */}
      {selectedReport === ReportType.SALES && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Sales Report View
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose a channel-specific view for management analysis. Dates are
            filtered using Sri Lanka time (Asia/Colombo).
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {salesViews.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => {
                    setSelectedSalesView(item.view);
                    setReportData(null);
                  }}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedSalesView === item.view
                      ? "border-orange-400 bg-orange-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon
                      className={`w-5 h-5 ${
                        selectedSalesView === item.view
                          ? "text-orange-600"
                          : "text-gray-600"
                      }`}
                    />
                    <span className="text-sm font-semibold text-gray-900">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{item.description}</p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Report Calculation Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Profit &amp; Loss Report Settings
          </h3>
          {savingSettings && (
            <span className="text-xs text-gray-400 ml-2">Saving...</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Choose which income and expense sources are included in Profit &amp;
          Loss report calculations.
        </p>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm font-medium text-gray-800">
                Include Jobsheet Income &amp; Costs
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Jobsheet labour and parts revenue/costs will be factored into
                gross profit
              </p>
            </div>
            <button
              role="switch"
              aria-checked={includeJobsheet}
              disabled={savingSettings}
              onClick={() =>
                handleToggleSetting("reportIncludeJobsheet", !includeJobsheet)
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 ${includeJobsheet ? "bg-orange-500" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${includeJobsheet ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </label>

          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm font-medium text-gray-800">
                Include Supplier Payments as Expenses
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Supplier payments will be counted as operating expenses and
                deducted from net profit
              </p>
            </div>
            <button
              role="switch"
              aria-checked={includeSupplierPayment}
              disabled={savingSettings}
              onClick={() =>
                handleToggleSetting(
                  "reportIncludeSupplierPayment",
                  !includeSupplierPayment,
                )
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 disabled:opacity-50 ${includeSupplierPayment ? "bg-orange-500" : "bg-gray-300"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${includeSupplierPayment ? "translate-x-6" : "translate-x-1"}`}
              />
            </button>
          </label>
        </div>
      </Card>

      {/* Generate Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerateReport}
          disabled={loading}
          className="bg-orange-600 hover:bg-orange-700 inline-flex items-center px-8 py-3 text-lg font-medium"
          size="lg"
        >
          <FileText className="w-5 h-5 mr-2" />
          Generate Report
        </Button>
      </div>
      <Card className="p-8">
        {reportData ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Report Preview
            </h3>
            <div className="mb-6">
              {renderReportTable(selectedReport, reportData)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedReport === "sales" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Sales</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalSales}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(reportData.summary?.netRevenue)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Profit</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(reportData.summary?.totalProfit)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatNumber(reportData.summary?.profitMargin)}%
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Order Value</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(reportData.summary?.averageOrderValue)}
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "inventory" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalItems}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.summary?.totalValue)}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-red-600">
                      {reportData.summary.lowStockItems}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Out of Stock Items</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {reportData.summary.outOfStockItems}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Optimal Stock Items</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {reportData.summary.optimalStockItems}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Stock Health Score</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {reportData.summary.stockHealthScore}
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "staff_performance" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Staff</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalStaff}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Active Staff</p>
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.summary.activeStaff}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(reportData.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Sales per Staff</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(reportData.summary?.averageSalesPerStaff)}
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Completed Orders</p>
                    <p className="text-xl font-bold text-emerald-600">
                      {reportData.summary.completedOrdersCount || 0} (
                      {formatCurrency(
                        reportData.summary.completedOrdersAmount || 0,
                      )}
                      )
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Processing Orders</p>
                    <p className="text-xl font-bold text-amber-600">
                      {reportData.summary.processingOrdersCount || 0} (
                      {formatCurrency(
                        reportData.summary.processingOrdersAmount || 0,
                      )}
                      )
                    </p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Returned Orders</p>
                    <p className="text-xl font-bold text-rose-600">
                      {reportData.summary.returnedOrdersCount || 0} (
                      {formatCurrency(
                        reportData.summary.returnedOrdersAmount || 0,
                      )}
                      )
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Products Sold Qty</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {reportData.summary.totalCompletedProductQty || 0}
                    </p>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Processing Qty</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {reportData.summary.totalProcessingProductQty || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Returned Qty</p>
                    <p className="text-2xl font-bold text-red-600">
                      {reportData.summary.totalReturnedProductQty || 0}
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "customer_analysis" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Customers</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalCustomers}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">New Customers</p>
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.summary.newCustomers}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Retention Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatNumber(reportData.summary?.customerRetentionRate)}%
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg Customer Value</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {formatCurrency(reportData.summary?.averageCustomerValue)}
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "shop_performance" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Locations</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalLocations}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Avg per Location</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        reportData.summary?.averageRevenuePerLocation,
                      )}
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "profit_loss" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(reportData.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Profit</p>
                    <p
                      className={`text-2xl font-bold ${reportData.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(reportData.summary?.netProfit)}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Net Profit Margin</p>
                    <p
                      className={`text-2xl font-bold ${reportData.summary.netProfitMargin >= 0 ? "text-purple-600" : "text-red-600"}`}
                    >
                      {formatNumber(reportData.summary?.netProfitMargin)}%
                    </p>
                  </div>
                </>
              )}
              {selectedReport === "jobsheet" && reportData.summary && (
                <>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Jobsheets</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.totalJobsheets}
                    </p>
                  </div>
                  {/* <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Completion Rate</p>
                    <p className="text-2xl font-bold text-green-600">
                      {reportData.summary.completionRate}
                    </p>
                  </div> */}
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(reportData.summary?.totalRevenue)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Pending Jobs</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {reportData.summary.pendingJobs}
                    </p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">In Progress</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {reportData.summary.inProgressJobs}
                    </p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Unique Customers</p>
                    <p className="text-2xl font-bold text-indigo-600">
                      {reportData.summary.uniqueCustomers}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Report Preview
            </h3>
            <p>
              Select report type and period, then click "Generate Report" to
              view
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
