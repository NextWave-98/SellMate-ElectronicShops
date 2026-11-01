import { CASH_DENOMINATIONS } from '@/utils/cashDenominations';

interface DenominationCounterProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  counts: Record<string, number>;
  onCountsChange: (counts: Record<string, number>) => void;
  label?: string;
}

export function sumDenominations(counts: Record<string, number>): number {
  return Object.entries(counts).reduce(
    (sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0),
    0,
  );
}

export default function DenominationCounter({
  enabled,
  onEnabledChange,
  counts,
  onCountsChange,
  label = 'Count by denomination',
}: DenominationCounterProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
          className="rounded border-gray-300"
        />
        {label}
      </label>
      {enabled && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border border-gray-200 p-3 bg-gray-50">
          {CASH_DENOMINATIONS.map((denom) => (
            <label key={denom} className="flex items-center justify-between gap-2 text-sm">
              <span className="font-medium text-gray-700">Rs. {denom}</span>
              <input
                type="number"
                min={0}
                step={1}
                value={counts[String(denom)] ?? ''}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  const next = { ...counts };
                  if (!Number.isFinite(n) || n <= 0) delete next[String(denom)];
                  else next[String(denom)] = n;
                  onCountsChange(next);
                }}
                className="w-20 rounded border border-gray-200 px-2 py-1 text-right"
                placeholder="0"
              />
            </label>
          ))}
          <div className="col-span-full text-sm font-semibold text-gray-900 pt-1">
            Total: Rs. {sumDenominations(counts).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
          </div>
        </div>
      )}
    </div>
  );
}
