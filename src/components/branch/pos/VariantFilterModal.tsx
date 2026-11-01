import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Search, SlidersHorizontal, X } from 'lucide-react';
import type { VariantFilterGroup } from '../../../hooks/useInventory';
import { countVariantSelections, type VariantFilterSelection } from './variantFilterSelection';

/**
 * Quick POS "filter by variant" picker.
 *
 * An organization can have dozens of sizes, colours and storage options, which
 * would swamp the product toolbar as chips, so they live in this modal. Values
 * within one attribute are OR-ed (Red or Blue); different attributes are AND-ed
 * (Red and 128GB). Nothing changes until Apply.
 */
export default function VariantFilterModal({
  groups,
  loading,
  value,
  onApply,
  onClose,
}: {
  groups: VariantFilterGroup[];
  loading?: boolean;
  value: VariantFilterSelection;
  onApply: (next: VariantFilterSelection) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<VariantFilterSelection>(value);
  const [query, setQuery] = useState('');

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) =>
        g.label.toLowerCase().includes(q)
          ? g
          : { ...g, values: g.values.filter((v) => v.value.toLowerCase().includes(q)) },
      )
      .filter((g) => g.values.length > 0);
  }, [groups, query]);

  const isSelected = (key: string, val: string) =>
    (draft[key] ?? []).some((v) => v.toLowerCase() === val.toLowerCase());

  const toggle = (key: string, val: string) => {
    setDraft((d) => {
      const current = d[key] ?? [];
      const next = isSelected(key, val)
        ? current.filter((v) => v.toLowerCase() !== val.toLowerCase())
        : [...current, val];
      const copy = { ...d };
      if (next.length > 0) copy[key] = next;
      else delete copy[key];
      return copy;
    });
  };

  const selectedCount = countVariantSelections(draft);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex w-full max-w-lg max-h-[85vh] flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-[#1e3a8a]" />
            <h3 className="text-base font-semibold text-gray-900">Filter by Variant</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-5 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search variants (e.g. Red, 128GB, XL)…"
              className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading variants…
            </div>
          ) : visibleGroups.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              {groups.length === 0 ? 'No product variants found' : 'No variants match your search'}
            </p>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.key}>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {group.label}
                  </p>
                  {(draft[group.key]?.length ?? 0) > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDraft((d) => {
                          const copy = { ...d };
                          delete copy[group.key];
                          return copy;
                        })
                      }
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.values.map((v) => {
                    const selected = isSelected(group.key, v.value);
                    return (
                      <button
                        key={v.value}
                        type="button"
                        onClick={() => toggle(group.key, v.value)}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          selected
                            ? 'border-[#1e3a8a] bg-[#1e3a8a] text-white'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {selected && <Check className="h-3 w-3" />}
                        {v.value}
                        <span className={selected ? 'text-white/70' : 'text-gray-400'}>
                          {v.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={() => setDraft({})}
            disabled={selectedCount === 0}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 disabled:opacity-40"
          >
            Clear all
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onApply(draft)}
              className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e40af]"
            >
              Apply{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
