import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Phone,
  RotateCcw,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PhoneOrderInsights } from '../../hooks/useCourier';

export interface BulkImportOrderPreview {
  groupKey: string;
  orderLabel: string;
  recipientName: string;
  phone: string;
  rowNumbers: number[];
  insights: PhoneOrderInsights | null;
}

export interface BulkImportCustomerPreview {
  phone: string;
  recipientName: string;
  rowNumbers: number[];
  orderCount: number;
  insights: PhoneOrderInsights | null;
}

export interface BulkImportPreviewResult {
  totalRowGroups: number;
  parseErrors: Array<{ row: number; message: string }>;
  orders?: BulkImportOrderPreview[];
  customers: BulkImportCustomerPreview[];
  summary: {
    uniqueCustomers: number;
    customersWithHistory: number;
    customersWithDuplicates: number;
    highRiskCustomers: number;
  };
}

interface BulkImportCustomerReviewProps {
  preview: BulkImportPreviewResult;
  onAccept: (excludeGroupKeys: string[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

function riskBadgeClass(risk: PhoneOrderInsights['riskLevel']) {
  switch (risk) {
    case 'HIGH':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'MEDIUM':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'LOW':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-green-100 text-green-800 border-green-200';
  }
}

function resolvePreviewOrders(preview: BulkImportPreviewResult): BulkImportOrderPreview[] {
  if (preview.orders?.length) return preview.orders;
  return preview.customers.map((customer, index) => ({
    groupKey: `customer:${customer.phone}:${index}`,
    orderLabel: customer.orderCount > 1 ? `${customer.orderCount} orders` : `Rows ${customer.rowNumbers.join(', ')}`,
    recipientName: customer.recipientName,
    phone: customer.phone,
    rowNumbers: customer.rowNumbers,
    insights: customer.insights,
  }));
}

export function buildImportExclusionPayload(
  preview: BulkImportPreviewResult,
  excludedGroupKeys: string[],
): { excludeGroupKeys: string[]; excludeRows: number[] } {
  const orders = resolvePreviewOrders(preview);
  const excluded = new Set(excludedGroupKeys);
  const excludeGroupKeysOut: string[] = [];
  const excludeRows: number[] = [];

  for (const order of orders) {
    if (!excluded.has(order.groupKey)) continue;
    if (order.groupKey.startsWith('customer:')) {
      excludeRows.push(...order.rowNumbers);
    } else {
      excludeGroupKeysOut.push(order.groupKey);
    }
  }

  return { excludeGroupKeys: excludeGroupKeysOut, excludeRows };
}

function OrderCard({
  order,
  excluded,
  onToggleExclude,
}: {
  order: BulkImportOrderPreview;
  excluded: boolean;
  onToggleExclude: () => void;
}) {
  const [expanded, setExpanded] = useState(
    !excluded && !!(order.insights?.hasPreviousOrders || order.insights?.hasPossibleDuplicate),
  );
  const ins = order.insights;

  return (
    <div
      className={`border rounded-lg overflow-hidden transition-opacity ${
        excluded
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 min-w-0 flex items-start gap-3 text-left hover:bg-gray-50/80 transition-colors rounded-lg -m-1 p-1"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-medium truncate ${excluded ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                {order.recipientName}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                {order.orderLabel}
              </span>
              {ins?.riskLevel && ins.riskLevel !== 'NONE' && !excluded && (
                <span className={`text-xs px-2 py-0.5 rounded-full border ${riskBadgeClass(ins.riskLevel)}`}>
                  {ins.riskLevel} risk
                </span>
              )}
              {ins?.hasPossibleDuplicate && !excluded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Possible duplicate
                </span>
              )}
              {excluded && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">
                  Excluded
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {order.phone}
              </span>
              <span>Rows: {order.rowNumbers.join(', ')}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            {ins?.hasPreviousOrders && !excluded ? (
              <div className="text-sm font-semibold text-gray-800">
                {ins.successRate !== null ? `${ins.successRate}%` : 'N/A'}
                <span className="block text-xs font-normal text-gray-500">success rate</span>
              </div>
            ) : !excluded ? (
              <span className="text-xs text-green-600 font-medium">New customer</span>
            ) : null}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-gray-400 ml-auto mt-1" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto mt-1" />
            )}
          </div>
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleExclude}
          className={`shrink-0 h-8 ${excluded ? 'text-blue-600 border-blue-200' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
          title={excluded ? 'Include this order again' : 'Remove this order from import'}
        >
          {excluded ? (
            <>
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Undo
            </>
          ) : (
            <>
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Remove
            </>
          )}
        </Button>
      </div>

      {expanded && !excluded && ins?.hasPreviousOrders && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 bg-gray-50/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-center">
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-lg font-bold text-gray-900">{ins.totalOrders}</div>
              <div className="text-xs text-gray-500">Total orders</div>
            </div>
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-lg font-bold text-green-700 flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" />
                {ins.deliveredOrders}
              </div>
              <div className="text-xs text-gray-500">Delivered</div>
            </div>
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-lg font-bold text-red-600 flex items-center justify-center gap-1">
                <TrendingDown className="w-4 h-4" />
                {ins.returnedOrders}
              </div>
              <div className="text-xs text-gray-500">Returned</div>
            </div>
            <div className="bg-white rounded p-2 border border-gray-100">
              <div className="text-lg font-bold text-blue-700">{ins.inProgressOrders}</div>
              <div className="text-xs text-gray-500">In progress</div>
            </div>
          </div>

          {ins.recentOrders.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Recent orders</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {ins.recentOrders.map((recent) => (
                  <div
                    key={recent.id}
                    className="flex items-center justify-between text-xs bg-white border border-gray-100 rounded px-2 py-1.5"
                  >
                    <span className="font-medium text-gray-800">#{recent.shipmentNumber}</span>
                    <span className="text-gray-500">{recent.status.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400">
                      {new Date(recent.createdAt).toLocaleDateString('en-LK', { timeZone: 'Asia/Colombo' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ins.hasPossibleDuplicate && ins.possibleDuplicates.length > 0 && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Active orders today (possible duplicates)
              </p>
              <div className="mt-1 space-y-1">
                {ins.possibleDuplicates.map((dup) => (
                  <div key={dup.id} className="text-xs text-amber-900 flex justify-between">
                    <span>#{dup.shipmentNumber}</span>
                    <span>{dup.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {expanded && !excluded && !ins?.hasPreviousOrders && (
        <div className="px-3 pb-3 text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50">
          No previous courier orders found for this phone number.
        </div>
      )}
    </div>
  );
}

export default function BulkImportCustomerReview({
  preview,
  onAccept,
  onCancel,
  loading = false,
}: BulkImportCustomerReviewProps) {
  const orders = useMemo(() => resolvePreviewOrders(preview), [preview]);
  const [excludedGroupKeys, setExcludedGroupKeys] = useState<Set<string>>(() => new Set());

  const includedOrders = orders.filter((order) => !excludedGroupKeys.has(order.groupKey));
  const excludedCount = orders.length - includedOrders.length;

  const includedSummary = useMemo(() => {
    const phones = new Set(includedOrders.map((o) => o.phone));
    return {
      orderCount: includedOrders.length,
      customerCount: phones.size,
      withHistory: includedOrders.filter((o) => o.insights?.hasPreviousOrders).length,
      withDuplicates: includedOrders.filter((o) => o.insights?.hasPossibleDuplicate).length,
    };
  }, [includedOrders]);

  const hasWarnings = includedSummary.withDuplicates > 0 ||
    includedOrders.some((o) => o.insights?.riskLevel === 'HIGH');

  const toggleExclude = (groupKey: string) => {
    setExcludedGroupKeys((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="shrink-0 space-y-4">
        <div className={`p-4 rounded-lg border ${hasWarnings ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-start gap-3">
            {hasWarnings ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold text-gray-900">Review orders before creating</p>
              <p className="text-sm text-gray-600 mt-1">
                {includedSummary.orderCount} of {preview.totalRowGroups} order{preview.totalRowGroups !== 1 ? 's' : ''} selected
                {excludedCount > 0 && (
                  <> · {excludedCount} excluded</>
                )}
                {includedSummary.customerCount > 0 && (
                  <> · {includedSummary.customerCount} customer{includedSummary.customerCount !== 1 ? 's' : ''}</>
                )}
                {includedSummary.withHistory > 0 && (
                  <> · {includedSummary.withHistory} with previous orders</>
                )}
                {includedSummary.withDuplicates > 0 && (
                  <> · {includedSummary.withDuplicates} with possible duplicates</>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">Remove any order you do not want to import, then accept.</p>
            </div>
          </div>
        </div>

        {preview.parseErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-800">
            <p className="font-medium">{preview.parseErrors.length} row(s) missing phone — will be skipped on import</p>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1">
        {orders.map((order) => (
          <OrderCard
            key={order.groupKey}
            order={order}
            excluded={excludedGroupKeys.has(order.groupKey)}
            onToggleExclude={() => toggleExclude(order.groupKey)}
          />
        ))}
      </div>

      <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white/95 pt-4 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => onAccept(Array.from(excludedGroupKeys))}
          disabled={loading || includedOrders.length === 0}
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700"
        >
          {loading
            ? 'Creating shipments...'
            : `Accept & Create ${includedOrders.length} Shipment${includedOrders.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}
