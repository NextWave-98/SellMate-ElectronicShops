/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Download, FileText, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useReports } from '../../hooks/useReports';
import { ReportPeriod, DateBasis } from '../../types/reports.types';

const PERIODS = [
  { period: ReportPeriod.TODAY, label: 'Today' },
  { period: ReportPeriod.WEEK, label: 'This Week' },
  { period: ReportPeriod.MONTH, label: 'This Month' },
  { period: ReportPeriod.QUARTER, label: 'This Quarter' },
  { period: ReportPeriod.YEAR, label: 'This Year' },
  { period: ReportPeriod.CUSTOM, label: 'Custom Range' },
];

export default function BranchStaffReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>(ReportPeriod.MONTH);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateBasis, setDateBasis] = useState<DateBasis>(DateBasis.UPDATED);
  const [reportData, setReportData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const { loading, generateBranchStaffReport, downloadBranchStaffReport } = useReports();

  const formatNumber = (value: any, digits = 1) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : ' ';
  };

  const formatCurrency = (value: any) => {
    const n = Number(value);
    return Number.isFinite(n) ? `Rs. ${n.toFixed(2)}` : ' ';
  };

  const buildRequest = () => {
    if (selectedPeriod === ReportPeriod.CUSTOM && (!startDate || !endDate)) {
      throw new Error('Please select both start and end dates for custom range.');
    }
    return {
      period: selectedPeriod,
      startDate: selectedPeriod === ReportPeriod.CUSTOM ? startDate : undefined,
      endDate: selectedPeriod === ReportPeriod.CUSTOM ? endDate : undefined,
      dateBasis,
    };
  };

  const handleGenerate = async () => {
    try {
      const request = buildRequest();
      const response = await generateBranchStaffReport(request);
      if (response?.data) {
        setReportData(response.data);
        toast.success('Branch report generated');
      } else {
        toast.error('No report data returned');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate report');
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const request = buildRequest();
      await downloadBranchStaffReport({ ...request, format: 'excel' });
      toast.success('Report downloaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  const data = reportData;
  const summary = data?.summary;
  const productRates = data?.productSuccessRates || [];
  const staffList = data?.staffRecords || [];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-orange-600" />
            Branch Staff Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Product success rates and staff activity for your branch only.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={loading || downloading}
            className="gap-2"
          >
            <Download className={`w-4 h-4 ${downloading ? 'animate-pulse' : ''}`} />
            {downloading ? 'Downloading…' : 'Download Excel'}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="gap-2 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating…' : 'Generate Report'}
          </Button>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Period</h3>
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.period}
                type="button"
                onClick={() => {
                  setSelectedPeriod(p.period);
                  setReportData(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                  selectedPeriod === p.period
                    ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {selectedPeriod === ReportPeriod.CUSTOM && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Date basis</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDateBasis(DateBasis.UPDATED);
                setReportData(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                dateBasis === DateBasis.UPDATED
                  ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              Updated in period
            </button>
            <button
              type="button"
              onClick={() => {
                setDateBasis(DateBasis.ACTIVITY);
                setReportData(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-sm border ${
                dateBasis === DateBasis.ACTIVITY
                  ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              Activity date
            </button>
          </div>
        </div>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {data && (
        <>
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Completed', value: `${summary.completedOrdersCount || 0}`, sub: formatCurrency(summary.completedOrdersAmount), bg: 'bg-green-50' },
                { label: 'Processing', value: `${summary.processingOrdersCount || 0}`, sub: formatCurrency(summary.processingOrdersAmount), bg: 'bg-amber-50' },
                { label: 'Returned', value: `${summary.returnedOrdersCount || 0}`, sub: formatCurrency(summary.returnedOrdersAmount), bg: 'bg-red-50' },
                { label: 'Completed Qty', value: `${summary.totalCompletedProductQty || 0}`, bg: 'bg-emerald-50' },
                { label: 'Processing Qty', value: `${summary.totalProcessingProductQty || 0}`, bg: 'bg-yellow-50' },
                { label: 'Returned Qty', value: `${summary.totalReturnedProductQty || 0}`, bg: 'bg-rose-50' },
              ].map((item) => (
                <Card key={item.label} className={`p-3 text-center ${item.bg}`}>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium">{item.label}</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">{item.value}</p>
                  {item.sub && <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>}
                </Card>
              ))}
            </div>
          )}

          {productRates.length > 0 && (
            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h2 className="text-md font-semibold text-gray-900">Product Success Rates (This Branch)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Success rate = Completed ÷ (Completed + Returned). Processing is shown separately.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Processing</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {productRates.map((p: any) => (
                      <tr key={p.productId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">{p.productName}</td>
                        <td className="px-4 py-2 text-sm text-gray-500">{p.sku || ' '}</td>
                        <td className="px-4 py-2 text-sm text-right font-semibold text-gray-900">{p.totalQty ?? 0}</td>
                        <td className="px-4 py-2 text-sm text-right text-green-700">{p.completedQty}</td>
                        <td className="px-4 py-2 text-sm text-right text-amber-600">{p.processingQty ?? 0}</td>
                        <td className="px-4 py-2 text-sm text-right text-red-600">{p.returnedQty}</td>
                        <td className="px-4 py-2 text-sm text-right font-bold text-violet-700">
                          {formatNumber(p.successRate)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <div className="space-y-3">
            <h2 className="text-md font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Records ({staffList.length})
            </h2>
            {staffList.length === 0 && (
              <Card className="p-6 text-center text-sm text-gray-500">
                No staff activity for this branch in the selected period.
              </Card>
            )}
            {staffList.map((staff: any) => (
              <Card key={staff.staffId} className="overflow-hidden p-0">
                <div className="bg-orange-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{staff.staffName}</p>
                    <p className="text-xs text-gray-500">{staff.position}</p>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Completed</p>
                      <p className="font-bold text-green-700">{staff.completedOrdersCount || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Processing</p>
                      <p className="font-bold text-amber-600">{staff.processingOrdersCount || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 uppercase">Returned</p>
                      <p className="font-bold text-red-600">{staff.returnedOrdersCount || 0}</p>
                    </div>
                  </div>
                </div>
                {staff.productSuccessRates?.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Completed</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Processing</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Returned</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Success</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {staff.productSuccessRates.map((p: any) => (
                          <tr key={p.productId}>
                            <td className="px-4 py-2 text-sm text-gray-900">{p.productName}</td>
                            <td className="px-4 py-2 text-sm text-right font-semibold">{p.totalQty ?? 0}</td>
                            <td className="px-4 py-2 text-sm text-right text-green-700">{p.completedQty}</td>
                            <td className="px-4 py-2 text-sm text-right text-amber-600">{p.processingQty ?? 0}</td>
                            <td className="px-4 py-2 text-sm text-right text-red-600">{p.returnedQty}</td>
                            <td className="px-4 py-2 text-sm text-right font-bold text-violet-700">
                              {formatNumber(p.successRate)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && !data && (
        <Card className="p-10 text-center text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">Select a period and click Generate Report to view your branch product success rates.</p>
        </Card>
      )}
    </div>
  );
}
