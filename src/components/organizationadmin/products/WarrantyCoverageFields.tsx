import { ShieldCheck, ShieldX, Info } from 'lucide-react';
import type { WarrantyCoverageItem } from '../../../hooks/useWarranty';

const inputCls =
  'w-full px-3 py-2 text-sm border border-white/40 bg-white/30 backdrop-blur-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent';

export type CoverageStance = 'INCLUDED' | 'EXCLUDED';
export type CoverageSelections = Record<string, CoverageStance>;

interface WarrantyCoverageFieldsProps {
  items: WarrantyCoverageItem[];
  loadingItems: boolean;
  selections: CoverageSelections;
  onToggle: (itemId: string, stance: CoverageStance) => void;
  provider: string;
  onProviderChange: (v: string) => void;
  doaDays: string;
  onDoaDaysChange: (v: string) => void;
  doaAction: string;
  onDoaActionChange: (v: string) => void;
  claimLimit: string;
  onClaimLimitChange: (v: string) => void;
}

/**
 * Provider / DOA / claim-limit fields plus the coverage tick-list.
 *
 * Deliberately separate from warrantyType (classification) and from the free
 * text Coverage/Exclusions fields above it on the page: this is "what is
 * covered", answered per item from the organization's own vocabulary, not a
 * paragraph someone has to read at claim time.
 *
 * Leaving every item untouched is a real, supported choice   it means this
 * product's warranty is still described by the free text alone, exactly as
 * it was before this feature existed.
 */
export default function WarrantyCoverageFields({
  items,
  loadingItems,
  selections,
  onToggle,
  provider,
  onProviderChange,
  doaDays,
  onDoaDaysChange,
  doaAction,
  onDoaActionChange,
  claimLimit,
  onClaimLimitChange,
}: WarrantyCoverageFieldsProps) {
  return (
    <div className="mt-5 pt-5 border-t border-white/30 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-800">Provider &amp; DOA</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          Who stands behind this warranty, and what happens if it arrives dead on arrival.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Provider</label>
          <select value={provider} onChange={(e) => onProviderChange(e.target.value)} className={inputCls}>
            <option value="">Not set</option>
            <option value="SHOP">Shop (us)</option>
            <option value="MANUFACTURER">Manufacturer</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="THIRD_PARTY">Third party</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claim Limit</label>
          <input
            type="number"
            min="0"
            value={claimLimit}
            onChange={(e) => onClaimLimitChange(e.target.value)}
            placeholder="Unlimited"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">Leave empty for unlimited claims</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DOA Window (days)</label>
          <input
            type="number"
            min="0"
            value={doaDays}
            onChange={(e) => onDoaDaysChange(e.target.value)}
            placeholder="e.g. 7"
            className={inputCls}
          />
          <p className="mt-1 text-xs text-gray-500">Dead-on-arrival period from the sale date</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">DOA Action</label>
          <select value={doaAction} onChange={(e) => onDoaActionChange(e.target.value)} className={inputCls}>
            <option value="">Not set</option>
            <option value="REPLACE">Replace</option>
            <option value="REFUND">Refund</option>
            <option value="REPAIR">Repair</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <h4 className="text-sm font-semibold text-gray-800">Coverage</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          Tick what this warranty covers and what it doesn't. Anything left
          blank stays unspecified   the free-text Coverage/Exclusions above
          still apply as the fallback wording on the card.
        </p>
      </div>

      {loadingItems ? (
        <p className="text-xs text-gray-400">Loading your coverage list…</p>
      ) : items.length === 0 ? (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-800">
            Your organization hasn't set up a coverage list yet. Add one from{' '}
            <span className="font-medium">Warranty → Coverage Settings</span>, then
            come back here to tick what this product's warranty covers.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item) => {
            const stance = selections[item.id];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/40 border border-white/40"
              >
                <span className="text-sm text-gray-800 truncate">{item.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id, 'INCLUDED')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      stance === 'INCLUDED'
                        ? 'bg-green-100 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-green-50'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Covered
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(item.id, 'EXCLUDED')}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
                      stance === 'EXCLUDED'
                        ? 'bg-red-100 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-red-50'
                    }`}
                  >
                    <ShieldX className="w-3.5 h-3.5" /> Excluded
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
