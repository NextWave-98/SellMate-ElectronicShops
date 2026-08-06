/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, Search, X } from 'lucide-react';

/**
 * AsyncSearchSelect — a reusable, server-backed searchable dropdown.
 *
 * Instead of pre-loading 500–1000 records into a <select>, this component
 * fetches only the top ~20 matches from the server as the user types
 * (debounced 300 ms). Works with any entity: pass a `fetcher` that calls the
 * existing search endpoint and maps the response to options.
 *
 * Usage:
 *   <AsyncSearchSelect<Supplier>
 *     value={selectedSupplier}
 *     onSelect={(s) => formik.setFieldValue('supplierId', s?.id ?? '')}
 *     fetcher={async (q) => {
 *       const res = await supplierHook.getAllSuppliers({ search: q || undefined, limit: 20, status: 'ACTIVE' });
 *       return Array.isArray(res?.data) ? res.data : [];
 *     }}
 *     getOptionLabel={(s) => s.name}
 *     getOptionSublabel={(s) => s.supplierCode}
 *     placeholder="Search supplier..."
 *   />
 */

export interface AsyncSearchSelectProps<T> {
  /** Currently selected item (controlled). */
  value: T | null;
  /** Called with the picked item, or null when cleared. */
  onSelect: (item: T | null) => void;
  /** Fetch matching options from the server. Empty string = initial/default list. */
  fetcher: (search: string) => Promise<T[]>;
  getOptionLabel: (item: T) => string;
  getOptionSublabel?: (item: T) => string | undefined;
  getOptionKey?: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  /** Extra classes for the input element. */
  inputClassName?: string;
  /** Rendered at the bottom of the dropdown (e.g. a "+ Create new" button). */
  footer?: React.ReactNode;
  /** Message when nothing matches. */
  emptyMessage?: string;
  /** Debounce in ms (default 300). */
  debounceMs?: number;
  /** Minimum characters before a server search runs (default 0 = search on focus/open). */
  minChars?: number;
  /** Shown in the dropdown while waiting for minChars. */
  minCharsMessage?: string;
  /** aria/name for the input. */
  name?: string;
  onBlur?: () => void;
}

export default function AsyncSearchSelect<T>({
  value,
  onSelect,
  fetcher,
  getOptionLabel,
  getOptionSublabel,
  getOptionKey,
  placeholder = 'Type to search...',
  disabled = false,
  inputClassName = '',
  footer,
  emptyMessage = 'No results found',
  debounceMs = 300,
  minChars = 0,
  minCharsMessage,
  name,
  onBlur,
}: AsyncSearchSelectProps<T>) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<T[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeq = useRef(0);
  // Keep the latest fetcher without retriggering effects (callers often pass inline fns)
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const keyOf = useCallback(
    (item: T) => (getOptionKey ? getOptionKey(item) : getOptionLabel(item)),
    [getOptionKey, getOptionLabel]
  );

  const waitingForInput = query.trim().length < minChars;
  const hintMessage =
    minCharsMessage ??
    (minChars > 0 ? `Type at least ${minChars} character${minChars === 1 ? '' : 's'} to search` : emptyMessage);

  const runSearch = useCallback((search: string) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    fetcherRef.current(search)
      .then((results) => {
        if (seq !== requestSeq.current) return; // stale response — ignore
        setOptions(Array.isArray(results) ? results : []);
        setHighlighted(-1);
      })
      .catch(() => {
        if (seq === requestSeq.current) setOptions([]);
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false);
      });
  }, []);

  // Debounced fetch while the dropdown is open
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < minChars) {
      requestSeq.current += 1; // invalidate in-flight requests
      setLoading(false);
      setOptions([]);
      setHighlighted(-1);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed), trimmed ? debounceMs : 0);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, debounceMs, minChars, runSearch]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        onBlur?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const handlePick = (item: T) => {
    onSelect(item);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && options[highlighted]) handlePick(options[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  const displayText = open ? query : value ? getOptionLabel(value) : '';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          name={name}
          value={displayText}
          disabled={disabled}
          placeholder={value && !open ? getOptionLabel(value) : placeholder}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            if (minChars === 0) runSearch('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full pl-9 pr-14 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400 ${inputClassName}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
          {value && !disabled && (
            <button type="button" onClick={handleClear} tabIndex={-1} className="p-0.5 text-gray-400 hover:text-gray-600" title="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {waitingForInput ? (
            <div className="px-4 py-3 text-sm text-gray-500">{hintMessage}</div>
          ) : loading && options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Searching...
            </div>
          ) : options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">{emptyMessage}</div>
          ) : (
            options.map((item, idx) => {
              const sub = getOptionSublabel?.(item);
              const isSelected = value != null && keyOf(item) === keyOf(value);
              return (
                <button
                  key={keyOf(item)}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // keep input focus behaviour predictable
                    handlePick(item);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center gap-2 hover:bg-orange-50 ${
                    idx === highlighted ? 'bg-orange-50' : ''
                  } ${isSelected ? 'bg-orange-100 font-medium' : ''}`}
                >
                  <span className="truncate">{getOptionLabel(item)}</span>
                  {sub && <span className="text-xs text-gray-400 shrink-0">{sub}</span>}
                </button>
              );
            })
          )}
          {footer && <div className="border-t border-gray-100">{footer}</div>}
        </div>
      )}
    </div>
  );
}
