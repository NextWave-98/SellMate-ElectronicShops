import { ReportType, ReportPeriod, SalesView, DateBasis } from "../types/reports.types";
import useFetch from "./useFetch";

interface GenerateReportRequest {
  reportType: ReportType;
  period: ReportPeriod;
  format?: "json" | "pdf" | "excel" | "csv";
  startDate?: string;
  endDate?: string;
  locationId?: string;
  branchId?: string;
  /** Sales report only: total | courier | offline */
  salesView?: SalesView;
  /** Which timestamp the date range filters on. Defaults to updatedAt. */
  dateBasis?: DateBasis;
}

interface DownloadReportRequest extends GenerateReportRequest {
  format: "json" | "pdf" | "excel" | "csv";
}

export const useReports = () => {
  const { loading, error, fetchData } = useFetch();

  /**
   * Generate Report
   */
  const generateReport = async (request: GenerateReportRequest) => {
    const result = await fetchData({
      method: "POST",
      endpoint: "/reports/generate",
      data: request,
      silent: true,
    });
    return result;
  };

  /**
   * Download Report
   */
  const downloadReport = async (request: DownloadReportRequest) => {
    const result = await fetchData({
      method: "POST",
      endpoint: "/reports/download",
      data: request,
      responseType: "blob",
      silent: true,
    });

    if (!result || !(result instanceof Blob)) {
      throw new Error("Failed to download report");
    }

    const blob = result;

    // Handle JSON format differently
    if (request.format === "json") {
      // For JSON, convert blob to text and parse
      const text = await blob.text();
      const data = JSON.parse(text);
      const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(jsonBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${request.reportType}_${request.period}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return;
    }

    // For other formats (PDF, Excel, CSV)
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Determine file extension
    let extension = "txt";
    if (request.format === "pdf") extension = "pdf";
    else if (request.format === "excel") extension = "xlsx";
    else if (request.format === "csv") extension = "csv";

    link.download = `${request.reportType}_${request.period}_${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const downloadBranchStaffReport = async (
    request: Pick<DownloadReportRequest, 'period' | 'format' | 'startDate' | 'endDate'>,
  ) => {
    const result = await fetchData({
      method: 'POST',
      endpoint: '/reports/branch/staff-download',
      data: request,
      responseType: 'blob',
      silent: true,
    });

    if (!result || !(result instanceof Blob)) {
      throw new Error('Failed to download staff report');
    }

    const url = window.URL.createObjectURL(result);
    const link = document.createElement('a');
    link.href = url;
    link.download = `staff_report_${request.period}_${Date.now()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  /**
   * Generate Sales Report
   */
  const generateSalesReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "sales",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  /**
   * Generate Profit & Loss Report
   */
  const generateProfitLossReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "profit_loss",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  /**
   * Generate Inventory Report
   */
  const generateInventoryReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "inventory",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  /**
   * Generate Staff Performance Report
   */
  const generateStaffPerformanceReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "staff_performance",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  /**
   * Generate Customer Analysis Report
   */
  const generateCustomerAnalysisReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "customer_analysis",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  /**
   * Generate Shop Performance Report
   */
  const generateShopPerformanceReport = async (
    period: ReportPeriod,
    startDate?: string,
    endDate?: string,
    locationId?: string,
  ) => {
    return generateReport({
      reportType: "shop_performance",
      period,
      startDate,
      endDate,
      locationId,
    });
  };

  return {
    loading,
    error,
    generateReport,
    downloadReport,
    downloadBranchStaffReport,
    generateSalesReport,
    generateProfitLossReport,
    generateInventoryReport,
    generateStaffPerformanceReport,
    generateCustomerAnalysisReport,
    generateShopPerformanceReport,
  };
};
